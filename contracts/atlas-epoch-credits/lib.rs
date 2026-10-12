#![cfg_attr(not(feature = "std"), no_std, no_main)]

/// Atlas Credits are intentionally non-transferable contribution records.
/// The contract mints them only after an epoch root is published by the
/// designated verifier and the recipient proves inclusion in that root.
#[ink::contract]
mod atlas_epoch_credits {
    use ink::{
        env::{hash::Blake2x256, hash_bytes},
        prelude::vec::Vec,
        storage::Mapping,
    };
    use scale::Encode;

    pub type Epoch = u64;

    #[derive(scale::Encode, scale::Decode, Debug, PartialEq, Eq)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error {
        NotVerifier,
        EpochAlreadyPublished,
        UnknownEpoch,
        EmptyRoot,
        AlreadyClaimed,
        InvalidProof,
        CreditOverflow,
    }

    #[ink(event)]
    pub struct EpochPublished {
        #[ink(topic)]
        epoch: Epoch,
        root: Hash,
    }

    #[ink(event)]
    pub struct CreditsClaimed {
        #[ink(topic)]
        epoch: Epoch,
        #[ink(topic)]
        sentinel: AccountId,
        amount: u128,
        total_credits: u128,
    }

    #[ink(storage)]
    pub struct AtlasEpochCredits {
        verifier: AccountId,
        epoch_roots: Mapping<Epoch, Hash>,
        published: Mapping<Epoch, bool>,
        claimed: Mapping<(Epoch, AccountId), bool>,
        credits: Mapping<AccountId, u128>,
    }

    impl AtlasEpochCredits {
        #[ink(constructor)]
        pub fn new(verifier: AccountId) -> Self {
            Self {
                verifier,
                epoch_roots: Mapping::default(),
                published: Mapping::default(),
                claimed: Mapping::default(),
                credits: Mapping::default(),
            }
        }

        /// Publishes a commitment to all accepted contributions in an epoch.
        /// It can never be overwritten, preserving a stable claim set.
        #[ink(message)]
        pub fn publish_epoch(&mut self, epoch: Epoch, root: Hash) -> Result<(), Error> {
            if self.env().caller() != self.verifier {
                return Err(Error::NotVerifier);
            }
            if self.published.get(epoch).unwrap_or(false) {
                return Err(Error::EpochAlreadyPublished);
            }
            if root == Hash::from([0u8; 32]) {
                return Err(Error::EmptyRoot);
            }
            self.epoch_roots.insert(epoch, &root);
            self.published.insert(epoch, &true);
            self.env().emit_event(EpochPublished { epoch, root });
            Ok(())
        }

        /// Claims credits once. A leaf is Blake2x256(SCALE(account, amount)).
        /// Proof nodes are ordered lexicographically before each pair hash.
        #[ink(message)]
        pub fn claim(&mut self, epoch: Epoch, amount: u128, proof: Vec<Hash>) -> Result<(), Error> {
            let sentinel = self.env().caller();
            if self.claimed.get((epoch, sentinel)).unwrap_or(false) {
                return Err(Error::AlreadyClaimed);
            }
            let root = self.epoch_roots.get(epoch).ok_or(Error::UnknownEpoch)?;
            let mut current = Self::leaf(&sentinel, amount);
            for sibling in proof {
                current = if current <= sibling {
                    Self::pair_hash(&current, &sibling)
                } else {
                    Self::pair_hash(&sibling, &current)
                };
            }
            if current != root {
                return Err(Error::InvalidProof);
            }
            let total_credits = self
                .credits
                .get(sentinel)
                .unwrap_or(0)
                .checked_add(amount)
                .ok_or(Error::CreditOverflow)?;
            self.credits.insert(sentinel, &total_credits);
            self.claimed.insert((epoch, sentinel), &true);
            self.env().emit_event(CreditsClaimed {
                epoch,
                sentinel,
                amount,
                total_credits,
            });
            Ok(())
        }

        #[ink(message)]
        pub fn epoch_root(&self, epoch: Epoch) -> Option<Hash> {
            self.epoch_roots.get(epoch)
        }

        #[ink(message)]
        pub fn credits_of(&self, sentinel: AccountId) -> u128 {
            self.credits.get(sentinel).unwrap_or(0)
        }

        #[ink(message)]
        pub fn has_claimed(&self, epoch: Epoch, sentinel: AccountId) -> bool {
            self.claimed.get((epoch, sentinel)).unwrap_or(false)
        }

        #[ink(message)]
        pub fn verifier(&self) -> AccountId {
            self.verifier
        }

        fn leaf(account: &AccountId, amount: u128) -> Hash {
            let encoded = (account, amount).encode();
            Self::hash(&encoded)
        }

        fn pair_hash(left: &Hash, right: &Hash) -> Hash {
            let mut input = [0u8; 64];
            input[..32].copy_from_slice(left.as_ref());
            input[32..].copy_from_slice(right.as_ref());
            Self::hash(&input)
        }

        fn hash(input: &[u8]) -> Hash {
            let mut output = [0u8; 32];
            hash_bytes::<Blake2x256>(input, &mut output);
            Hash::from(output)
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        use ink::env::test;

        #[ink::test]
        fn verifier_publishes_and_sentinel_claims_once() {
            let accounts = test::default_accounts::<ink::env::DefaultEnvironment>();
            let mut contract = AtlasEpochCredits::new(accounts.alice);
            let root = AtlasEpochCredits::leaf(&accounts.alice, 25);
            assert_eq!(contract.publish_epoch(1, root), Ok(()));
            assert_eq!(contract.claim(1, 25, Vec::new()), Ok(()));
            assert_eq!(contract.credits_of(accounts.alice), 25);
            assert_eq!(contract.claim(1, 25, Vec::new()), Err(Error::AlreadyClaimed));
        }

        #[ink::test]
        fn invalid_proof_and_non_verifier_are_rejected() {
            let accounts = test::default_accounts::<ink::env::DefaultEnvironment>();
            let mut contract = AtlasEpochCredits::new(accounts.alice);
            test::set_caller::<ink::env::DefaultEnvironment>(accounts.bob);
            assert_eq!(contract.publish_epoch(1, Hash::from([1u8; 32])), Err(Error::NotVerifier));
            test::set_caller::<ink::env::DefaultEnvironment>(accounts.alice);
            let root = AtlasEpochCredits::leaf(&accounts.alice, 25);
            contract.publish_epoch(1, root).expect("verifier publishes");
            test::set_caller::<ink::env::DefaultEnvironment>(accounts.bob);
            assert_eq!(contract.claim(1, 25, Vec::new()), Err(Error::InvalidProof));
        }

        #[ink::test]
        fn two_sentinels_claim_against_the_same_merkle_root() {
            let accounts = test::default_accounts::<ink::env::DefaultEnvironment>();
            let mut contract = AtlasEpochCredits::new(accounts.alice);
            let alice_leaf = AtlasEpochCredits::leaf(&accounts.alice, 25);
            let bob_leaf = AtlasEpochCredits::leaf(&accounts.bob, 40);
            let root = if alice_leaf <= bob_leaf {
                AtlasEpochCredits::pair_hash(&alice_leaf, &bob_leaf)
            } else {
                AtlasEpochCredits::pair_hash(&bob_leaf, &alice_leaf)
            };
            contract.publish_epoch(7, root).expect("verifier publishes root");
            contract.claim(7, 25, vec![bob_leaf]).expect("alice proof is valid");
            test::set_caller::<ink::env::DefaultEnvironment>(accounts.bob);
            contract.claim(7, 40, vec![alice_leaf]).expect("bob proof is valid");
            assert_eq!(contract.credits_of(accounts.alice), 25);
            assert_eq!(contract.credits_of(accounts.bob), 40);
        }
    }
}
