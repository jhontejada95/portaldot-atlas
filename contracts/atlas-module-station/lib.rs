#![cfg_attr(not(feature = "std"), no_std, no_main)]

/// Issues non-transferable contribution Modules backed by an evidence commitment.
#[ink::contract]
mod atlas_module_station {
    use ink::storage::Mapping;

    #[derive(scale::Encode, scale::Decode, Debug, PartialEq, Eq, Clone, Copy)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub enum ModuleStatus { Active, Revoked, Superseded }

    #[derive(scale::Encode, scale::Decode, Debug, PartialEq, Eq, Clone, Copy)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct ModuleRecord { pub holder: AccountId, pub class_hash: Hash, pub evidence_id: Hash, pub policy_hash: Hash, pub season: u64, pub status: ModuleStatus, pub issued_at: BlockNumber }

    #[derive(scale::Encode, scale::Decode, Debug, PartialEq, Eq)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error { NotIssuer, EmptyId, AlreadyIssued, UnknownModule, InvalidTransition }

    #[ink(event)] pub struct ModuleIssued { #[ink(topic)] module_id: Hash, #[ink(topic)] holder: AccountId, class_hash: Hash, evidence_id: Hash, season: u64 }
    #[ink(event)] pub struct ModuleStatusChanged { #[ink(topic)] module_id: Hash, status: ModuleStatus }

    #[ink(storage)]
    pub struct AtlasModuleStation { issuer: AccountId, modules: Mapping<Hash, ModuleRecord> }

    impl AtlasModuleStation {
        #[ink(constructor)] pub fn new(issuer: AccountId) -> Self { Self { issuer, modules: Mapping::default() } }

        #[ink(message)]
        pub fn issue(&mut self, module_id: Hash, holder: AccountId, class_hash: Hash, evidence_id: Hash, policy_hash: Hash, season: u64) -> Result<(), Error> {
            if self.env().caller() != self.issuer { return Err(Error::NotIssuer); }
            if module_id == Hash::from([0u8; 32]) || class_hash == Hash::from([0u8; 32]) || evidence_id == Hash::from([0u8; 32]) || policy_hash == Hash::from([0u8; 32]) { return Err(Error::EmptyId); }
            if self.modules.contains(module_id) { return Err(Error::AlreadyIssued); }
            self.modules.insert(module_id, &ModuleRecord { holder, class_hash, evidence_id, policy_hash, season, status: ModuleStatus::Active, issued_at: self.env().block_number() });
            self.env().emit_event(ModuleIssued { module_id, holder, class_hash, evidence_id, season });
            Ok(())
        }

        #[ink(message)] pub fn revoke(&mut self, module_id: Hash) -> Result<(), Error> { self.change_status(module_id, ModuleStatus::Revoked) }
        #[ink(message)] pub fn supersede(&mut self, module_id: Hash) -> Result<(), Error> { self.change_status(module_id, ModuleStatus::Superseded) }
        fn change_status(&mut self, module_id: Hash, status: ModuleStatus) -> Result<(), Error> {
            if self.env().caller() != self.issuer { return Err(Error::NotIssuer); }
            let mut record = self.modules.get(module_id).ok_or(Error::UnknownModule)?;
            if record.status != ModuleStatus::Active { return Err(Error::InvalidTransition); }
            record.status = status;
            self.modules.insert(module_id, &record);
            self.env().emit_event(ModuleStatusChanged { module_id, status });
            Ok(())
        }
        #[ink(message)] pub fn module(&self, module_id: Hash) -> Option<ModuleRecord> { self.modules.get(module_id) }
        #[ink(message)] pub fn issuer(&self) -> AccountId { self.issuer }
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        use ink::env::test;
        fn h(value: u8) -> Hash { Hash::from([value; 32]) }
        #[ink::test]
        fn module_is_issued_without_transfer_and_can_be_revoked() {
            let accounts = test::default_accounts::<ink::env::DefaultEnvironment>();
            let mut contract = AtlasModuleStation::new(accounts.alice);
            assert_eq!(contract.issue(h(1), accounts.bob, h(2), h(3), h(4), 0), Ok(()));
            assert_eq!(contract.revoke(h(1)), Ok(()));
            assert_eq!(contract.module(h(1)).unwrap().status, ModuleStatus::Revoked);
        }
    }
}
