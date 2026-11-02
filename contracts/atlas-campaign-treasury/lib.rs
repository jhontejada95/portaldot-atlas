#![cfg_attr(not(feature = "std"), no_std, no_main)]

/// Optional native-token treasury for sponsored campaigns. It is intentionally
/// separate from the campaign registry so no campaign can silently custody funds.
#[ink::contract]
mod atlas_campaign_treasury {
    use ink::storage::Mapping;

    #[derive(scale::Encode, scale::Decode, Debug, PartialEq, Eq, Clone, Copy)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct Budget { pub sponsor: AccountId, pub funded: Balance, pub released: Balance, pub active: bool }

    #[derive(scale::Encode, scale::Decode, Debug, PartialEq, Eq)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error { NotReviewer, NotSponsor, AlreadyExists, UnknownCampaign, Inactive, ZeroValue, InsufficientFunds, TransferFailed }

    #[ink(event)] pub struct BudgetCreated { #[ink(topic)] campaign_id: Hash, #[ink(topic)] sponsor: AccountId }
    #[ink(event)] pub struct BudgetFunded { #[ink(topic)] campaign_id: Hash, #[ink(topic)] sponsor: AccountId, amount: Balance, total_funded: Balance }
    #[ink(event)] pub struct RewardReleased { #[ink(topic)] campaign_id: Hash, #[ink(topic)] recipient: AccountId, amount: Balance }
    #[ink(event)] pub struct BudgetClosed { #[ink(topic)] campaign_id: Hash }

    #[ink(storage)]
    pub struct AtlasCampaignTreasury { reviewer: AccountId, budgets: Mapping<Hash, Budget> }

    impl AtlasCampaignTreasury {
        #[ink(constructor)] pub fn new(reviewer: AccountId) -> Self { Self { reviewer, budgets: Mapping::default() } }

        #[ink(message)]
        pub fn create_budget(&mut self, campaign_id: Hash) -> Result<(), Error> {
            if self.budgets.contains(campaign_id) { return Err(Error::AlreadyExists); }
            let sponsor = self.env().caller();
            self.budgets.insert(campaign_id, &Budget { sponsor, funded: 0, released: 0, active: true });
            self.env().emit_event(BudgetCreated { campaign_id, sponsor });
            Ok(())
        }

        #[ink(message, payable)]
        pub fn fund(&mut self, campaign_id: Hash) -> Result<(), Error> {
            let mut budget = self.budgets.get(campaign_id).ok_or(Error::UnknownCampaign)?;
            if budget.sponsor != self.env().caller() { return Err(Error::NotSponsor); }
            if !budget.active { return Err(Error::Inactive); }
            let amount = self.env().transferred_value();
            if amount == 0 { return Err(Error::ZeroValue); }
            budget.funded = budget.funded.checked_add(amount).ok_or(Error::InsufficientFunds)?;
            self.budgets.insert(campaign_id, &budget);
            self.env().emit_event(BudgetFunded { campaign_id, sponsor: budget.sponsor, amount, total_funded: budget.funded });
            Ok(())
        }

        #[ink(message)]
        pub fn release(&mut self, campaign_id: Hash, recipient: AccountId, amount: Balance) -> Result<(), Error> {
            if self.env().caller() != self.reviewer { return Err(Error::NotReviewer); }
            let mut budget = self.budgets.get(campaign_id).ok_or(Error::UnknownCampaign)?;
            if !budget.active { return Err(Error::Inactive); }
            let available = budget.funded.checked_sub(budget.released).ok_or(Error::InsufficientFunds)?;
            if amount == 0 || amount > available { return Err(Error::InsufficientFunds); }
            self.env().transfer(recipient, amount).map_err(|_| Error::TransferFailed)?;
            budget.released = budget.released.checked_add(amount).ok_or(Error::InsufficientFunds)?;
            self.budgets.insert(campaign_id, &budget);
            self.env().emit_event(RewardReleased { campaign_id, recipient, amount });
            Ok(())
        }

        #[ink(message)]
        pub fn close(&mut self, campaign_id: Hash) -> Result<(), Error> {
            let mut budget = self.budgets.get(campaign_id).ok_or(Error::UnknownCampaign)?;
            if self.env().caller() != self.reviewer && self.env().caller() != budget.sponsor { return Err(Error::NotSponsor); }
            if !budget.active { return Err(Error::Inactive); }
            budget.active = false;
            self.budgets.insert(campaign_id, &budget);
            self.env().emit_event(BudgetClosed { campaign_id });
            Ok(())
        }

        #[ink(message)] pub fn budget(&self, campaign_id: Hash) -> Option<Budget> { self.budgets.get(campaign_id) }
        #[ink(message)] pub fn reviewer(&self) -> AccountId { self.reviewer }
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        use ink::env::test;
        fn h(value: u8) -> Hash { Hash::from([value; 32]) }
        #[ink::test]
        fn sponsor_can_create_and_close_budget() {
            let accounts = test::default_accounts::<ink::env::DefaultEnvironment>();
            let mut contract = AtlasCampaignTreasury::new(accounts.alice);
            assert_eq!(contract.create_budget(h(1)), Ok(()));
            assert_eq!(contract.budget(h(1)).unwrap().sponsor, accounts.alice);
            assert_eq!(contract.close(h(1)), Ok(()));
        }
    }
}
