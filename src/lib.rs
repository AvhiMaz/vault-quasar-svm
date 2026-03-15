#![no_std]

mod entrypoint;

#[cfg(feature = "std")]
extern crate std;

pub mod instructions;
pub mod states;
