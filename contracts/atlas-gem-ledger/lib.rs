#![cfg_attr(not(feature = "std"), no_std, no_main)]

/// Non-transferable seasonal Gems. Claims are authorized by epoch Merkle roots;
/// spending always names an explicit sink and never transfers between wallets.
#[ink::contract]
mod atlas_gem_ledger {
    use ink::{env::{hash::Blake2x256, hash_bytes}, prelude::vec::Vec, storage::Mapping};
    use scale::Encode;

    pub type Epoch = u64;
    pub type Season = u64;

    #[derive(scale::Encode, scale::Decode, Debug, PartialEq, Eq, Clone, Copy)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct SeasonPolicy { pub budget: u128, pub emitted: u128, pub spent: u128, pub active: bool }

    #[derive(scale::Encode, scale::Decode, Debug, PartialEq, Eq)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error { NotVerifier, AlreadyPublished, UnknownEpoch, EmptyRoot, EmptyPolicy, EmptyEpoch, AlreadyClaimed, InvalidProof, BudgetExceeded, InsufficientBalance, SeasonInactive, ZeroAmount }

    #[ink(event)] pub struct EpochPublished { #[ink(topic)] epoch: Epoch, #[ink(topic)] season: Season, root: Hash, policy_hash: Hash, evidence_count: u32 }
    #[ink(event)] pub struct GemsClaimed { #[ink(topic)] season: Season, #[ink(topic)] epoch: Epoch, #[ink(topic)] wallet: AccountId, amount: u128, contribution_commitment: Hash, total_balance: u128 }
    #[ink(event)] pub struct GemsSpent { #[ink(topic)] season: Season, #[ink(topic)] wallet: AccountId, #[ink(topic)] sink_id: Hash, amount: u128, remaining_balance: u128 }

    #[ink(storage)]
    pub struct AtlasGemLedger {
        verifier: AccountId,
        seasons: Mapping<Season, SeasonPolicy>,
        roots: Mapping<Epoch, (Season, Hash, Hash, u32)>,
        claimed: Mapping<(Epoch, AccountId), bool>,
        balances: Mapping<(Season, AccountId), u128>,
        spent_by_sink: Mapping<(Season, AccountId, Hash), u128>,
    }

    impl AtlasGemLedger {
        #[ink(constructor)] pub fn new(verifier: AccountId) -> Self { Self { verifier, seasons: Mapping::default(), roots: Mapping::default(), claimed: Mapping::default(), balances: Mapping::default(), spent_by_sink: Mapping::default() } }

        #[ink(message)]
        pub fn configure_season(&mut self, season: Season, budget: u128) -> Result<(), Error> {
            if self.env().caller() != self.verifier { return Err(Error::NotVerifier); }
            self.seasons.insert(season, &SeasonPolicy { budget, emitted: 0, spent: 0, active: true });
            Ok(())
        }

        #[ink(message)]
        pub fn close_season(&mut self, season: Season) -> Result<(), Error> {
            if self.env().caller() != self.verifier { return Err(Error::NotVerifier); }
            let mut policy = self.seasons.get(season).ok_or(Error::SeasonInactive)?;
            policy.active = false;
            self.seasons.insert(season, &policy);
            Ok(())
        }

        #[ink(message)]
        pub fn publish_epoch(&mut self, season: Season, epoch: Epoch, root: Hash, policy_hash: Hash, evidence_count: u32) -> Result<(), Error> {
            if self.env().caller() != self.verifier { return Err(Error::NotVerifier); }
            if root == Hash::from([0u8; 32]) { return Err(Error::EmptyRoot); }
            if policy_hash == Hash::from([0u8; 32]) { return Err(Error::EmptyPolicy); }
            if evidence_count == 0 { return Err(Error::EmptyEpoch); }
            if self.roots.contains(epoch) { return Err(Error::AlreadyPublished); }
            if !self.seasons.get(season).map(|p| p.active).unwrap_or(false) { return Err(Error::SeasonInactive); }
            self.roots.insert(epoch, &(season, root, policy_hash, evidence_count));
            self.env().emit_event(EpochPublished { epoch, season, root, policy_hash, evidence_count });
            Ok(())
        }

        #[ink(message)]
        pub fn claim(&mut self, epoch: Epoch, amount: u128, contribution_commitment: Hash, proof: Vec<Hash>) -> Result<(), Error> {
            if amount == 0 { return Err(Error::ZeroAmount); }
            let (season, root, _, _) = self.roots.get(epoch).ok_or(Error::UnknownEpoch)?;
            let mut policy = self.seasons.get(season).ok_or(Error::SeasonInactive)?;
            if !policy.active { return Err(Error::SeasonInactive); }
            let wallet = self.env().caller();
            if self.claimed.get((epoch, wallet)).unwrap_or(false) { return Err(Error::AlreadyClaimed); }
            let mut current = Self::leaf(&wallet, amount, &contribution_commitment);
            for sibling in proof { current = if current <= sibling { Self::pair_hash(&current, &sibling) } else { Self::pair_hash(&sibling, &current) }; }
            if current != root { return Err(Error::InvalidProof); }
            let next_emitted = policy.emitted.checked_add(amount).ok_or(Error::BudgetExceeded)?;
            if next_emitted > policy.budget { return Err(Error::BudgetExceeded); }
            let current_balance = self.balances.get((season, wallet)).unwrap_or(0);
            let next_balance = current_balance.checked_add(amount).ok_or(Error::BudgetExceeded)?;
            policy.emitted = next_emitted;
            self.seasons.insert(season, &policy);
            self.balances.insert((season, wallet), &next_balance);
            self.claimed.insert((epoch, wallet), &true);
            self.env().emit_event(GemsClaimed { season, epoch, wallet, amount, contribution_commitment, total_balance: next_balance });
            Ok(())
        }

        #[ink(message)]
        pub fn spend(&mut self, season: Season, amount: u128, sink_id: Hash) -> Result<(), Error> {
            if amount == 0 { return Err(Error::ZeroAmount); }
            if sink_id == Hash::from([0u8; 32]) { return Err(Error::EmptyPolicy); }
            let mut policy = self.seasons.get(season).ok_or(Error::SeasonInactive)?;
            if !policy.active { return Err(Error::SeasonInactive); }
            let wallet = self.env().caller();
            let balance = self.balances.get((season, wallet)).unwrap_or(0);
            if balance < amount { return Err(Error::InsufficientBalance); }
            let remaining = balance.checked_sub(amount).ok_or(Error::InsufficientBalance)?;
            policy.spent = policy.spent.checked_add(amount).ok_or(Error::BudgetExceeded)?;
            self.seasons.insert(season, &policy);
            self.balances.insert((season, wallet), &remaining);
            let spent = self.spent_by_sink.get((season, wallet, sink_id)).unwrap_or(0).checked_add(amount).ok_or(Error::BudgetExceeded)?;
            self.spent_by_sink.insert((season, wallet, sink_id), &spent);
            self.env().emit_event(GemsSpent { season, wallet, sink_id, amount, remaining_balance: remaining });
            Ok(())
        }

        #[ink(message)] pub fn balance_of(&self, season: Season, wallet: AccountId) -> u128 { self.balances.get((season, wallet)).unwrap_or(0) }
        #[ink(message)] pub fn season(&self, season: Season) -> Option<SeasonPolicy> { self.seasons.get(season) }

        fn leaf(wallet: &AccountId, amount: u128, commitment: &Hash) -> Hash { let encoded = (wallet, amount, commitment).encode(); Self::hash(&encoded) }
        fn pair_hash(left: &Hash, right: &Hash) -> Hash { let mut input = [0u8; 64]; input[..32].copy_from_slice(left.as_ref()); input[32..].copy_from_slice(right.as_ref()); Self::hash(&input) }
        fn hash(input: &[u8]) -> Hash { let mut output = [0u8; 32]; hash_bytes::<Blake2x256>(input, &mut output); Hash::from(output) }
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        use ink::env::test;
        fn h(value: u8) -> Hash { Hash::from([value; 32]) }
        #[ink::test]
        fn claim_and_spend_are_non_transferable() {
            let accounts = test::default_accounts::<ink::env::DefaultEnvironment>();
            let mut contract = AtlasGemLedger::new(accounts.alice);
            assert_eq!(contract.configure_season(1, 100), Ok(()));
            let root = AtlasGemLedger::leaf(&accounts.alice, 25, &h(3));
            assert_eq!(contract.publish_epoch(1, 7, root, h(4), 1), Ok(()));
            assert_eq!(contract.claim(7, 25, h(3), Vec::new()), Ok(()));
            assert_eq!(contract.spend(1, 10, h(5)), Ok(()));
            assert_eq!(contract.balance_of(1, accounts.alice), 15);
        }
    }
}
