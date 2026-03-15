use pinocchio::{error::ProgramError, AccountView, Address, ProgramResult};
use pinocchio_pubkey::derive_address;
use pinocchio_system::instructions::Transfer;

pub const LAMPORTS_PER_SOL: u64 = 1_000_000_000;

use crate::states::{load_ix_data, DataLen};

#[repr(C)]
pub struct DeposiIxtData {
    pub amount: u64,
    pub bump: u8,
}

impl DataLen for DeposiIxtData {
    const LEN: usize = core::mem::size_of::<DeposiIxtData>();
}

pub fn process_deposit(
    program_id: &Address,
    accounts: &[AccountView],
    data: &[u8],
) -> ProgramResult {
    let [deposit_acc, vault_acc, _system_program] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };

    if !deposit_acc.is_signer() {
        return Err(ProgramError::MissingRequiredSignature);
    }

    let ix_data = load_ix_data::<DeposiIxtData>(data)?;

    let seeds: [&[u8]; 2] = [
        b"pinocchio_vault_pda",
        deposit_acc.address().as_array().as_ref(),
    ];

    let vault_pda = derive_address(&seeds, Some(ix_data.bump), program_id.as_array());

    if vault_acc.address().as_array() != &vault_pda {
        return Err(ProgramError::InvalidAccountData);
    }

    Transfer {
        from: deposit_acc,
        to: vault_acc,
        lamports: ix_data.amount * LAMPORTS_PER_SOL,
    }
    .invoke()?;

    Ok(())
}
