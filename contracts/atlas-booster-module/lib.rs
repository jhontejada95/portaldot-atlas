#![cfg_attr(not(feature = "std"), no_std, no_main)]

/// Fixed-rule seasonal boosters. This contract never transfers a booster or
/// grants an amount by itself; consumers must enforce the published caps.
#[ink::contract]
mod atlas_booster_module {
    use ink::storage::Mapping;

    #[derive(scale::Encode, scale::Decode, Debug, PartialEq, Eq, Clone, Copy)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct Booster { pub owner: AccountId, pub class_hash: Hash, pub season: u64, pub bonus_bps: u16, pub expires_at: BlockNumber, pub active: bool }

    #[derive(scale::Encode, scale::Decode, Debug, PartialEq, Eq)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error { NotIssuer, NotOwner, EmptyId, AlreadyIssued, UnknownBooster, AlreadyActive, AnotherBoosterActive, NotActive, InvalidBonus }

    #[ink(event)] pub struct BoosterIssued { #[ink(topic)] booster_id: Hash, #[ink(topic)] owner: AccountId, season: u64, bonus_bps: u16, expires_at: BlockNumber }
    #[ink(event)] pub struct BoosterActivationChanged { #[ink(topic)] booster_id: Hash, #[ink(topic)] owner: AccountId, active: bool }

    #[ink(storage)]
    pub struct AtlasBoosterModule { issuer: AccountId, boosters: Mapping<Hash, Booster>, active_for: Mapping<AccountId, Hash> }

    impl AtlasBoosterModule {
        #[ink(constructor)] pub fn new(issuer: AccountId) -> Self { Self { issuer, boosters: Mapping::default(), active_for: Mapping::default() } }

        #[ink(message)]
        pub fn issue(&mut self, booster_id: Hash, owner: AccountId, class_hash: Hash, season: u64, bonus_bps: u16, expires_at: BlockNumber) -> Result<(), Error> {
            if self.env().caller() != self.issuer { return Err(Error::NotIssuer); }
            if booster_id == Hash::from([0u8; 32]) || class_hash == Hash::from([0u8; 32]) { return Err(Error::EmptyId); }
            if bonus_bps == 0 || bonus_bps > 2_000 { return Err(Error::InvalidBonus); }
            if self.boosters.contains(booster_id) { return Err(Error::AlreadyIssued); }
            self.boosters.insert(booster_id, &Booster { owner, class_hash, season, bonus_bps, expires_at, active: false });
            self.env().emit_event(BoosterIssued { booster_id, owner, season, bonus_bps, expires_at });
            Ok(())
        }

        #[ink(message)]
        pub fn activate(&mut self, booster_id: Hash) -> Result<(), Error> {
            let mut booster = self.boosters.get(booster_id).ok_or(Error::UnknownBooster)?;
            if booster.owner != self.env().caller() { return Err(Error::NotOwner); }
            if booster.active { return Err(Error::AlreadyActive); }
            if self.active_for.contains(booster.owner) { return Err(Error::AnotherBoosterActive); }
            if self.env().block_number() > booster.expires_at { return Err(Error::NotActive); }
            booster.active = true;
            self.boosters.insert(booster_id, &booster);
            self.active_for.insert(booster.owner, &booster_id);
            self.env().emit_event(BoosterActivationChanged { booster_id, owner: booster.owner, active: true });
            Ok(())
        }

        #[ink(message)]
        pub fn deactivate(&mut self, booster_id: Hash) -> Result<(), Error> {
            let mut booster = self.boosters.get(booster_id).ok_or(Error::UnknownBooster)?;
            if booster.owner != self.env().caller() { return Err(Error::NotOwner); }
            if !booster.active { return Err(Error::NotActive); }
            booster.active = false;
            self.boosters.insert(booster_id, &booster);
            self.active_for.remove(booster.owner);
            self.env().emit_event(BoosterActivationChanged { booster_id, owner: booster.owner, active: false });
            Ok(())
        }

        #[ink(message)] pub fn booster(&self, booster_id: Hash) -> Option<Booster> { self.boosters.get(booster_id) }
        #[ink(message)] pub fn active_booster(&self, owner: AccountId) -> Option<Hash> { self.active_for.get(owner) }
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        use ink::env::test;
        fn h(value: u8) -> Hash { Hash::from([value; 32]) }
        #[ink::test]
        fn only_one_booster_can_be_active() {
            let accounts = test::default_accounts::<ink::env::DefaultEnvironment>();
            let mut contract = AtlasBoosterModule::new(accounts.alice);
            assert_eq!(contract.issue(h(1), accounts.bob, h(2), 1, 500, 100), Ok(()));
            assert_eq!(contract.issue(h(3), accounts.bob, h(4), 1, 1_000, 100), Ok(()));
            test::set_caller::<ink::env::DefaultEnvironment>(accounts.bob);
            assert_eq!(contract.activate(h(1)), Ok(()));
            assert_eq!(contract.activate(h(3)), Err(Error::AnotherBoosterActive));
            assert_eq!(contract.deactivate(h(1)), Ok(()));
        }
    }
}
