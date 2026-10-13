#![cfg_attr(not(feature = "std"), no_std, no_main)]

/// A privacy-preserving registry for Atlas Sentinel device keys.
///
/// Only a 32-byte commitment to the P-256 device public key is recorded. The
/// key itself, browser identity, IP address and observations remain off-chain.
#[ink::contract]
mod atlas_sentinel_registry {
    use ink::storage::Mapping;

    pub type SentinelCommitment = Hash;

    #[derive(scale::Encode, scale::Decode, Debug, PartialEq, Eq, Clone, Copy)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub enum SentinelStatus {
        Active,
        Revoked,
    }

    #[derive(scale::Encode, scale::Decode, Debug, PartialEq, Eq, Clone, Copy)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct SentinelRecord {
        owner: AccountId,
        registered_at: BlockNumber,
        status: SentinelStatus,
    }

    #[derive(scale::Encode, scale::Decode, Debug, PartialEq, Eq)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error {
        EmptyCommitment,
        SentinelAlreadyRegistered,
        UnknownSentinel,
        NotSentinelOwner,
        SentinelAlreadyRevoked,
    }

    #[ink(event)]
    pub struct SentinelRegistered {
        #[ink(topic)]
        commitment: SentinelCommitment,
        #[ink(topic)]
        owner: AccountId,
    }

    #[ink(event)]
    pub struct SentinelRevoked {
        #[ink(topic)]
        commitment: SentinelCommitment,
        #[ink(topic)]
        owner: AccountId,
    }

    #[ink(storage)]
    pub struct AtlasSentinelRegistry {
        sentinels: Mapping<SentinelCommitment, SentinelRecord>,
    }

    impl AtlasSentinelRegistry {
        #[ink(constructor)]
        pub fn new() -> Self {
            Self { sentinels: Mapping::default() }
        }

        /// Registers a new device-key commitment for the caller. Commitments
        /// are permanent: a revoked device is never silently reassigned.
        #[ink(message)]
        pub fn register(&mut self, commitment: SentinelCommitment) -> Result<(), Error> {
            if commitment == Hash::from([0u8; 32]) {
                return Err(Error::EmptyCommitment);
            }
            if self.sentinels.contains(commitment) {
                return Err(Error::SentinelAlreadyRegistered);
            }
            let owner = self.env().caller();
            self.sentinels.insert(commitment, &SentinelRecord {
                owner,
                registered_at: self.env().block_number(),
                status: SentinelStatus::Active,
            });
            self.env().emit_event(SentinelRegistered { commitment, owner });
            Ok(())
        }

        /// Revocation is owner-only. The original record remains queryable so
        /// historical evidence can distinguish a retired key from an unknown one.
        #[ink(message)]
        pub fn revoke(&mut self, commitment: SentinelCommitment) -> Result<(), Error> {
            let mut record = self.sentinels.get(commitment).ok_or(Error::UnknownSentinel)?;
            if record.owner != self.env().caller() {
                return Err(Error::NotSentinelOwner);
            }
            if record.status == SentinelStatus::Revoked {
                return Err(Error::SentinelAlreadyRevoked);
            }
            record.status = SentinelStatus::Revoked;
            self.sentinels.insert(commitment, &record);
            self.env().emit_event(SentinelRevoked { commitment, owner: record.owner });
            Ok(())
        }

        #[ink(message)]
        pub fn is_active(&self, commitment: SentinelCommitment) -> bool {
            self.sentinels
                .get(commitment)
                .map(|record: SentinelRecord| record.status == SentinelStatus::Active)
                .unwrap_or(false)
        }

        #[ink(message)]
        pub fn owner_of(&self, commitment: SentinelCommitment) -> Option<AccountId> {
            self.sentinels.get(commitment).map(|record: SentinelRecord| record.owner)
        }

        #[ink(message)]
        pub fn registered_at(&self, commitment: SentinelCommitment) -> Option<BlockNumber> {
            self.sentinels.get(commitment).map(|record: SentinelRecord| record.registered_at)
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        use ink::env::test;

        fn commitment(value: u8) -> SentinelCommitment {
            Hash::from([value; 32])
        }

        #[ink::test]
        fn registers_an_active_commitment_for_the_caller() {
            let accounts = test::default_accounts::<ink::env::DefaultEnvironment>();
            let mut contract = AtlasSentinelRegistry::new();
            assert_eq!(contract.register(commitment(1)), Ok(()));
            assert!(contract.is_active(commitment(1)));
            assert_eq!(contract.owner_of(commitment(1)), Some(accounts.alice));
            assert!(contract.registered_at(commitment(1)).is_some());
        }

        #[ink::test]
        fn rejects_empty_and_duplicate_commitments() {
            let mut contract = AtlasSentinelRegistry::new();
            assert_eq!(contract.register(Hash::from([0u8; 32])), Err(Error::EmptyCommitment));
            assert_eq!(contract.register(commitment(2)), Ok(()));
            assert_eq!(contract.register(commitment(2)), Err(Error::SentinelAlreadyRegistered));
        }

        #[ink::test]
        fn only_the_owner_can_revoke_and_the_record_remains_auditably_revoked() {
            let accounts = test::default_accounts::<ink::env::DefaultEnvironment>();
            let mut contract = AtlasSentinelRegistry::new();
            assert_eq!(contract.register(commitment(3)), Ok(()));
            test::set_caller::<ink::env::DefaultEnvironment>(accounts.bob);
            assert_eq!(contract.revoke(commitment(3)), Err(Error::NotSentinelOwner));
            test::set_caller::<ink::env::DefaultEnvironment>(accounts.alice);
            assert_eq!(contract.revoke(commitment(3)), Ok(()));
            assert!(!contract.is_active(commitment(3)));
            assert_eq!(contract.owner_of(commitment(3)), Some(accounts.alice));
            assert_eq!(contract.revoke(commitment(3)), Err(Error::SentinelAlreadyRevoked));
        }

        #[ink::test]
        fn unknown_commitments_cannot_be_revoked() {
            let mut contract = AtlasSentinelRegistry::new();
            assert_eq!(contract.revoke(commitment(4)), Err(Error::UnknownSentinel));
        }
    }
}
