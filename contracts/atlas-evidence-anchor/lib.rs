#![cfg_attr(not(feature = "std"), no_std, no_main)]

/// Anchors minimized evidence commitments and their review state.
/// Raw proofs remain off-chain; only hashes, identifiers and transitions are public.
#[ink::contract]
mod atlas_evidence_anchor {
    use ink::storage::Mapping;

    pub type EvidenceId = Hash;
    pub type CampaignId = Hash;
    pub type QuestId = Hash;

    #[derive(scale::Encode, scale::Decode, Debug, PartialEq, Eq, Clone, Copy)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub enum EvidenceStatus { Submitted, Accepted, Rejected, Revoked }

    #[derive(scale::Encode, scale::Decode, Debug, PartialEq, Eq, Clone, Copy)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct EvidenceRecord {
        pub campaign_id: CampaignId,
        pub quest_id: QuestId,
        pub subject: AccountId,
        pub policy_hash: Hash,
        pub commitment: Hash,
        pub status: EvidenceStatus,
        pub submitted_at: BlockNumber,
        pub reviewed_at: Option<BlockNumber>,
        pub reviewer: Option<AccountId>,
    }

    #[derive(scale::Encode, scale::Decode, Debug, PartialEq, Eq)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error {
        EmptyId,
        EmptyHash,
        AlreadyAnchored,
        UnknownEvidence,
        NotAnchorer,
        NotReviewer,
        InvalidTransition,
    }

    #[ink(event)]
    pub struct EvidenceAnchored { #[ink(topic)] evidence_id: EvidenceId, #[ink(topic)] subject: AccountId, campaign_id: CampaignId, quest_id: QuestId }
    #[ink(event)]
    pub struct EvidenceReviewed { #[ink(topic)] evidence_id: EvidenceId, #[ink(topic)] reviewer: AccountId, status: EvidenceStatus }
    #[ink(event)]
    pub struct EvidenceRevoked { #[ink(topic)] evidence_id: EvidenceId, #[ink(topic)] reviewer: AccountId }

    #[ink(storage)]
    pub struct AtlasEvidenceAnchor {
        anchorer: AccountId,
        reviewer: AccountId,
        evidence: Mapping<EvidenceId, EvidenceRecord>,
    }

    impl AtlasEvidenceAnchor {
        #[ink(constructor)]
        pub fn new(anchorer: AccountId, reviewer: AccountId) -> Self {
            Self { anchorer, reviewer, evidence: Mapping::default() }
        }

        #[ink(message)]
        pub fn anchor(&mut self, evidence_id: EvidenceId, campaign_id: CampaignId, quest_id: QuestId, subject: AccountId, policy_hash: Hash, commitment: Hash) -> Result<(), Error> {
            if self.env().caller() != self.anchorer { return Err(Error::NotAnchorer); }
            if evidence_id == Hash::from([0u8; 32]) || campaign_id == Hash::from([0u8; 32]) || quest_id == Hash::from([0u8; 32]) { return Err(Error::EmptyId); }
            if policy_hash == Hash::from([0u8; 32]) || commitment == Hash::from([0u8; 32]) { return Err(Error::EmptyHash); }
            if self.evidence.contains(evidence_id) { return Err(Error::AlreadyAnchored); }
            let record = EvidenceRecord { campaign_id, quest_id, subject, policy_hash, commitment, status: EvidenceStatus::Submitted, submitted_at: self.env().block_number(), reviewed_at: None, reviewer: None };
            self.evidence.insert(evidence_id, &record);
            self.env().emit_event(EvidenceAnchored { evidence_id, subject, campaign_id, quest_id });
            Ok(())
        }

        #[ink(message)]
        pub fn accept(&mut self, evidence_id: EvidenceId) -> Result<(), Error> { self.review(evidence_id, EvidenceStatus::Accepted) }

        #[ink(message)]
        pub fn reject(&mut self, evidence_id: EvidenceId) -> Result<(), Error> { self.review(evidence_id, EvidenceStatus::Rejected) }

        fn review(&mut self, evidence_id: EvidenceId, status: EvidenceStatus) -> Result<(), Error> {
            if self.env().caller() != self.reviewer { return Err(Error::NotReviewer); }
            let mut record = self.evidence.get(evidence_id).ok_or(Error::UnknownEvidence)?;
            if record.status != EvidenceStatus::Submitted { return Err(Error::InvalidTransition); }
            record.status = status;
            record.reviewed_at = Some(self.env().block_number());
            record.reviewer = Some(self.env().caller());
            self.evidence.insert(evidence_id, &record);
            self.env().emit_event(EvidenceReviewed { evidence_id, reviewer: self.env().caller(), status });
            Ok(())
        }

        #[ink(message)]
        pub fn revoke(&mut self, evidence_id: EvidenceId) -> Result<(), Error> {
            if self.env().caller() != self.reviewer { return Err(Error::NotReviewer); }
            let mut record = self.evidence.get(evidence_id).ok_or(Error::UnknownEvidence)?;
            if record.status == EvidenceStatus::Revoked { return Err(Error::InvalidTransition); }
            record.status = EvidenceStatus::Revoked;
            record.reviewed_at = Some(self.env().block_number());
            record.reviewer = Some(self.env().caller());
            self.evidence.insert(evidence_id, &record);
            self.env().emit_event(EvidenceRevoked { evidence_id, reviewer: self.env().caller() });
            Ok(())
        }

        #[ink(message)] pub fn evidence(&self, evidence_id: EvidenceId) -> Option<EvidenceRecord> { self.evidence.get(evidence_id) }
        #[ink(message)] pub fn anchorer(&self) -> AccountId { self.anchorer }
        #[ink(message)] pub fn reviewer(&self) -> AccountId { self.reviewer }
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        use ink::env::test;
        fn h(value: u8) -> Hash { Hash::from([value; 32]) }

        #[ink::test]
        fn anchors_and_accepts_once() {
            let accounts = test::default_accounts::<ink::env::DefaultEnvironment>();
            let mut contract = AtlasEvidenceAnchor::new(accounts.alice, accounts.bob);
            assert_eq!(contract.anchor(h(1), h(2), h(3), accounts.charlie, h(4), h(5)), Ok(()));
            test::set_caller::<ink::env::DefaultEnvironment>(accounts.bob);
            assert_eq!(contract.accept(h(1)), Ok(()));
            assert_eq!(contract.accept(h(1)), Err(Error::InvalidTransition));
        }

        #[ink::test]
        fn only_roles_can_write() {
            let accounts = test::default_accounts::<ink::env::DefaultEnvironment>();
            let mut contract = AtlasEvidenceAnchor::new(accounts.alice, accounts.bob);
            test::set_caller::<ink::env::DefaultEnvironment>(accounts.eve);
            assert_eq!(contract.anchor(h(1), h(2), h(3), accounts.charlie, h(4), h(5)), Err(Error::NotAnchorer));
        }
    }
}
