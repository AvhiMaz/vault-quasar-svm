use pinocchio::{
    cpi::{Seed, Signer},
    error::ProgramError,
    AccountView, Address, ProgramResult,
};
use pinocchio_pubkey::derive_address;
use pinocchio_system::instructions::Transfer;

pub fn process_withdraw(
    program_id: &Address,
    accounts: &[AccountView],
    data: &[u8],
) -> ProgramResult {
    let [withdraw_acc, vault_acc, _system_program] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };

    if !withdraw_acc.is_signer() {
        return Err(ProgramError::MissingRequiredSignature);
    }

    if !vault_acc.is_data_empty() && vault_acc.lamports() > 0 {
        return Err(ProgramError::InvalidAccountData);
    }

    let bump = data[0];

    let seeds = [b"pinocchio_vault_pda", withdraw_acc.address().as_ref()];
    let vault_pda = derive_address(&seeds, Some(bump), program_id.as_array());

    if vault_pda != *vault_acc.address().as_array() {
        return Err(ProgramError::InvalidAccountData);
    }

    let pda_byte_bump = [bump];
    let signer_seeds = [
        Seed::from("pinocchio_vault_pda".as_bytes()),
        Seed::from(withdraw_acc.address().as_array()),
        Seed::from(&pda_byte_bump),
    ];

    let signer = [Signer::from(&signer_seeds)];

    Transfer {
        from: vault_acc,
        to: withdraw_acc,
        lamports: vault_acc.lamports(),
    }
    .invoke_signed(&signer)?;

    Ok(())
}
