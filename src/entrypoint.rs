#![allow(unexpected_cfgs)]

use pinocchio::{
    error::ProgramError, no_allocator, nostd_panic_handler, program_entrypoint, AccountView,
    Address, ProgramResult,
};
use pinocchio_log::log;

use crate::instructions::{self, VaultInstruction};

program_entrypoint!(process_instruction);
no_allocator!();
nostd_panic_handler!();

pub fn process_instruction(
    program_id: &Address,
    accounts: &[AccountView],
    instruction_data: &[u8],
) -> ProgramResult {
    let (discriminator_variant, instruction_data) = instruction_data
        .split_first()
        .ok_or(ProgramError::InvalidInstructionData)?;

    match VaultInstruction::try_from(discriminator_variant)? {
        VaultInstruction::Deposit => {
            log!("Ix:0");
            instructions::process_deposit(program_id, accounts, instruction_data)?;
        }
        VaultInstruction::Withdraw => {
            log!("Ix:1");
            instructions::process_withdraw(program_id, accounts, instruction_data)?;
        }
    }

    Ok(())
}
