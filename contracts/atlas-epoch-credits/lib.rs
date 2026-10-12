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
        EmptyPolicyHash,
        EmptyEpoch,
        AlreadyClaimed,
        InvalidProof,
        CreditOverflow,
    }

    #[ink(event)]
    pub struct EpochPublished {
        #[ink(topic)]
        epoch: Epoch,
        root: Hash,
        policy_hash: Hash,
        evidence_count: u32,
    }

    #[ink(event)]
    pub struct CreditsClaimed {
        #[ink(topic)]
        epoch: Epoch,
        #[ink(topic)]
        sentinel: AccountId,
        amount: u128,
        contribution_commitment: Hash,
        total_credits: u128,
    }

    #[ink(storage)]
    pub struct AtlasEpochCredits {
        verifier: AccountId,
        epoch_roots: Mapping<Epoch, Hash>,
        epoch_policy_hashes: Mapping<Epoch, Hash>,
        epoch_evidence_counts: Mapping<Epoch, u32>,
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
                epoch_policy_hashes: Mapping::default(),
                epoch_evidence_counts: Mapping::default(),
                published: Mapping::default(),
                claimed: Mapping::default(),
                credits: Mapping::default(),
            }
        }

        /// Publishes a commitment to all accepted contributions in an epoch.
        /// It can never be overwritten, preserving a stable claim set.
        #[ink(message)]
        pub fn publish_epoch(
            &mut self,
            epoch: Epoch,
            root: Hash,
            policy_hash: Hash,
            evidence_count: u32,
        ) -> Result<(), Error> {
            if self.env().caller() != self.verifier {
                return Err(Error::NotVerifier);
            }
            if self.published.get(epoch).unwrap_or(false) {
                return Err(Error::EpochAlreadyPublished);
            }
            if root == Hash::from([0u8; 32]) {
                return Err(Error::EmptyRoot);
            }
            if policy_hash == Hash::from([0u8; 32]) {
                return Err(Error::EmptyPolicyHash);
            }
            if evidence_count == 0 {
                return Err(Error::EmptyEpoch);
            }
            self.epoch_roots.insert(epoch, &root);
            self.epoch_policy_hashes.insert(epoch, &policy_hash);
            self.epoch_evidence_counts.insert(epoch, &evidence_count);
            self.published.insert(epoch, &true);
            self.env().emit_event(EpochPublished { epoch, root, policy_hash, evidence_count });
            Ok(())
        }

        /// Claims credits once. A leaf is
        /// Blake2x256(SCALE(account, amount, contribution_commitment)).
        /// The commitment binds the exact accepted receipt set used to calculate
        /// the claim, rather than committing only to a balance chosen off-chain.
        /// Proof nodes are ordered lexicographically before each pair hash.
        #[ink(message)]
        pub fn claim(
            &mut self,
            epoch: Epoch,
            amount: u128,
            contribution_commitment: Hash,
            proof: Vec<Hash>,
        ) -> Result<(), Error> {
            let sentinel = self.env().caller();
            if self.claimed.get((epoch, sentinel)).unwrap_or(false) {
                return Err(Error::AlreadyClaimed);
            }
            let root = self.epoch_roots.get(epoch).ok_or(Error::UnknownEpoch)?;
            let mut current = Self::leaf(&sentinel, amount, &contribution_commitment);
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
                contribution_commitment,
                total_credits,
            });
            Ok(())
        }

        #[ink(message)]
        pub fn epoch_root(&self, epoch: Epoch) -> Option<Hash> {
            self.epoch_roots.get(epoch)
        }

        #[ink(message)]
        pub fn epoch_policy_hash(&self, epoch: Epoch) -> Option<Hash> {
            self.epoch_policy_hashes.get(epoch)
        }

        #[ink(message)]
        pub fn epoch_evidence_count(&self, epoch: Epoch) -> Option<u32> {
            self.epoch_evidence_counts.get(epoch)
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

        fn leaf(account: &AccountId, amount: u128, contribution_commitment: &Hash) -> Hash {
            let encoded = (account, amount, contribution_commitment).encode();
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
            let policy_hash = Hash::from([9u8; 32]);
            let contribution_commitment = Hash::from([1u8; 32]);
            let root = AtlasEpochCredits::leaf(&accounts.alice, 25, &contribution_commitment);
            assert_eq!(contract.publish_epoch(1, root, policy_hash, 1), Ok(()));
            assert_eq!(contract.claim(1, 25, contribution_commitment, Vec::new()), Ok(()));
            assert_eq!(contract.credits_of(accounts.alice), 25);
            assert_eq!(contract.claim(1, 25, contribution_commitment, Vec::new()), Err(Error::AlreadyClaimed));
        }

        #[ink::test]
        fn invalid_proof_and_non_verifier_are_rejected() {
            let accounts = test::default_accounts::<ink::env::DefaultEnvironment>();
            let mut contract = AtlasEpochCredits::new(accounts.alice);
            test::set_caller::<ink::env::DefaultEnvironment>(accounts.bob);
            assert_eq!(contract.publish_epoch(1, Hash::from([1u8; 32]), Hash::from([9u8; 32]), 1), Err(Error::NotVerifier));
            test::set_caller::<ink::env::DefaultEnvironment>(accounts.alice);
            let contribution_commitment = Hash::from([1u8; 32]);
            let root = AtlasEpochCredits::leaf(&accounts.alice, 25, &contribution_commitment);
            contract.publish_epoch(1, root, Hash::from([9u8; 32]), 1).expect("verifier publishes");
            test::set_caller::<ink::env::DefaultEnvironment>(accounts.bob);
            assert_eq!(contract.claim(1, 25, contribution_commitment, Vec::new()), Err(Error::InvalidProof));
        }

        #[ink::test]
        fn epoch_requires_policy_commitment_and_nonempty_evidence() {
            let accounts = test::default_accounts::<ink::env::DefaultEnvironment>();
            let mut contract = AtlasEpochCredits::new(accounts.alice);
            let root = Hash::from([1u8; 32]);
            assert_eq!(
                contract.publish_epoch(1, root, Hash::from([0u8; 32]), 1),
                Err(Error::EmptyPolicyHash),
            );
            assert_eq!(
                contract.publish_epoch(1, root, Hash::from([9u8; 32]), 0),
                Err(Error::EmptyEpoch),
            );
        }

        #[ink::test]
        fn contribution_commitment_cannot_be_swapped_after_root_publication() {
            let accounts = test::default_accounts::<ink::env::DefaultEnvironment>();
            let mut contract = AtlasEpochCredits::new(accounts.alice);
            let committed_receipts = Hash::from([1u8; 32]);
            let root = AtlasEpochCredits::leaf(&accounts.alice, 25, &committed_receipts);
            contract.publish_epoch(1, root, Hash::from([9u8; 32]), 1).expect("verifier publishes root");
            assert_eq!(
                contract.claim(1, 25, Hash::from([2u8; 32]), Vec::new()),
                Err(Error::InvalidProof),
            );
        }

        #[ink::test]
        fn two_sentinels_claim_against_the_same_merkle_root() {
            let accounts = test::default_accounts::<ink::env::DefaultEnvironment>();
            let mut contract = AtlasEpochCredits::new(accounts.alice);
            let alice_commitment = Hash::from([1u8; 32]);
            let bob_commitment = Hash::from([2u8; 32]);
            let alice_leaf = AtlasEpochCredits::leaf(&accounts.alice, 25, &alice_commitment);
            let bob_leaf = AtlasEpochCredits::leaf(&accounts.bob, 40, &bob_commitment);
            let root = if alice_leaf <= bob_leaf {
                AtlasEpochCredits::pair_hash(&alice_leaf, &bob_leaf)
            } else {
                AtlasEpochCredits::pair_hash(&bob_leaf, &alice_leaf)
            };
            contract.publish_epoch(7, root, Hash::from([9u8; 32]), 2).expect("verifier publishes root");
            contract.claim(7, 25, alice_commitment, vec![bob_leaf]).expect("alice proof is valid");
            test::set_caller::<ink::env::DefaultEnvironment>(accounts.bob);
            contract.claim(7, 40, bob_commitment, vec![alice_leaf]).expect("bob proof is valid");
            assert_eq!(contract.credits_of(accounts.alice), 25);
            assert_eq!(contract.credits_of(accounts.bob), 40);
        }
    }
}
