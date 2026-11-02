#![cfg_attr(not(feature = "std"), no_std, no_main)]

/// Registry for protocol-owned campaign commitments and lifecycle state.
#[ink::contract]
mod atlas_campaign_registry {
    use ink::storage::Mapping;

    pub type CampaignId = Hash;

    #[derive(scale::Encode, scale::Decode, Debug, PartialEq, Eq, Clone, Copy)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub enum CampaignState { Draft, Published, Paused, Closed }

    #[derive(scale::Encode, scale::Decode, Debug, PartialEq, Eq, Clone, Copy)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct Campaign {
        pub protocol: AccountId,
        pub rules_hash: Hash,
        pub budget: u128,
        pub max_per_wallet: u128,
        pub cooldown: u64,
        pub starts_at: u64,
        pub ends_at: u64,
        pub state: CampaignState,
    }

    #[derive(scale::Encode, scale::Decode, Debug, PartialEq, Eq)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error { EmptyId, EmptyRules, AlreadyExists, UnknownCampaign, NotProtocolOwner, InvalidTransition, InvalidWindow }

    #[ink(event)]
    pub struct CampaignCreated { #[ink(topic)] campaign_id: CampaignId, #[ink(topic)] protocol: AccountId, rules_hash: Hash }
    #[ink(event)]
    pub struct CampaignStateChanged { #[ink(topic)] campaign_id: CampaignId, state: CampaignState }

    #[ink(storage)]
    pub struct AtlasCampaignRegistry { campaigns: Mapping<CampaignId, Campaign> }

    impl AtlasCampaignRegistry {
        #[ink(constructor)] pub fn new() -> Self { Self { campaigns: Mapping::default() } }

        #[ink(message)]
        pub fn create(&mut self, campaign_id: CampaignId, rules_hash: Hash, budget: u128, max_per_wallet: u128, cooldown: u64, starts_at: u64, ends_at: u64) -> Result<(), Error> {
            if campaign_id == Hash::from([0u8; 32]) { return Err(Error::EmptyId); }
            if rules_hash == Hash::from([0u8; 32]) { return Err(Error::EmptyRules); }
            if starts_at >= ends_at { return Err(Error::InvalidWindow); }
            if self.campaigns.contains(campaign_id) { return Err(Error::AlreadyExists); }
            let protocol = self.env().caller();
            self.campaigns.insert(campaign_id, &Campaign { protocol, rules_hash, budget, max_per_wallet, cooldown, starts_at, ends_at, state: CampaignState::Draft });
            self.env().emit_event(CampaignCreated { campaign_id, protocol, rules_hash });
            Ok(())
        }

        #[ink(message)] pub fn publish(&mut self, campaign_id: CampaignId) -> Result<(), Error> { self.change_state(campaign_id, CampaignState::Published) }
        #[ink(message)] pub fn pause(&mut self, campaign_id: CampaignId) -> Result<(), Error> { self.change_state(campaign_id, CampaignState::Paused) }
        #[ink(message)] pub fn close(&mut self, campaign_id: CampaignId) -> Result<(), Error> { self.change_state(campaign_id, CampaignState::Closed) }

        fn change_state(&mut self, campaign_id: CampaignId, state: CampaignState) -> Result<(), Error> {
            let mut campaign = self.campaigns.get(campaign_id).ok_or(Error::UnknownCampaign)?;
            if campaign.protocol != self.env().caller() { return Err(Error::NotProtocolOwner); }
            let valid = match (campaign.state, state) {
                (CampaignState::Draft, CampaignState::Published) | (CampaignState::Published, CampaignState::Paused) | (CampaignState::Paused, CampaignState::Published) | (CampaignState::Published, CampaignState::Closed) | (CampaignState::Paused, CampaignState::Closed) => true,
                _ => false,
            };
            if !valid { return Err(Error::InvalidTransition); }
            campaign.state = state;
            self.campaigns.insert(campaign_id, &campaign);
            self.env().emit_event(CampaignStateChanged { campaign_id, state });
            Ok(())
        }

        #[ink(message)] pub fn campaign(&self, campaign_id: CampaignId) -> Option<Campaign> { self.campaigns.get(campaign_id) }
        #[ink(message)] pub fn exists(&self, campaign_id: CampaignId) -> bool { self.campaigns.contains(campaign_id) }
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        use ink::env::test;
        fn h(value: u8) -> Hash { Hash::from([value; 32]) }
        #[ink::test]
        fn protocol_publishes_and_pauses_campaign() {
            let accounts = test::default_accounts::<ink::env::DefaultEnvironment>();
            let mut contract = AtlasCampaignRegistry::new();
            assert_eq!(contract.create(h(1), h(2), 1_000, 100, 10, 1, 100), Ok(()));
            assert_eq!(contract.publish(h(1)), Ok(()));
            assert_eq!(contract.pause(h(1)), Ok(()));
            assert_eq!(contract.campaign(h(1)).unwrap().state, CampaignState::Paused);
            test::set_caller::<ink::env::DefaultEnvironment>(accounts.bob);
            assert_eq!(contract.publish(h(1)), Err(Error::NotProtocolOwner));
        }
    }
}
