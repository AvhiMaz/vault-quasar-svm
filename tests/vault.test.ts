import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  QuasarSvm,
  assertSuccess,
  type SvmAccount,
} from "@blueshift-gg/quasar-svm/kit";
import {
  address,
  getProgramDerivedAddress,
  getAddressEncoder,
} from "@solana/addresses";
import { AccountRole } from "@solana/instructions";
import { lamports } from "@solana/rpc-types";
import { readFileSync } from "node:fs";

const PROGRAM_ID = address("9V1GtVVQaA3grvMVHZD7drSrCAmmLKdMG2ck3dzj21wh");
const SYSTEM_PROGRAM = address("11111111111111111111111111111111");
const LAMPORTS_PER_SOL = 1_000_000_000n;
const PAYER = address("E6UcK3dSFc2yaFtEb35pc1WsBVcrPhEbnB87YoNDXhqy");

const addrEncoder = getAddressEncoder();

function encodeDeposit(amount: bigint, bump: number): Uint8Array {
  const buf = Buffer.alloc(10);
  buf[0] = 0;
  buf.writeBigUInt64LE(amount, 1);
  buf[9] = bump;
  return buf;
}

function encodeWithdraw(bump: number): Uint8Array {
  return new Uint8Array([1, bump]);
}

function emptySystemAccount(addr: ReturnType<typeof address>): SvmAccount {
  return {
    address: addr,
    data: new Uint8Array(0),
    executable: false,
    lamports: lamports(0n),
    programAddress: SYSTEM_PROGRAM,
    space: 0n,
  };
}

const IX_ACCOUNTS = (vaultPda: ReturnType<typeof address>) => [
  { address: PAYER, role: AccountRole.WRITABLE_SIGNER },
  { address: vaultPda, role: AccountRole.WRITABLE },
  { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
];

describe("pinocchio_vault", () => {
  let svm: QuasarSvm;
  let vaultPda: ReturnType<typeof address>;
  let bump: number;

  beforeEach(async () => {
    svm = new QuasarSvm();
    svm.addProgram(
      PROGRAM_ID,
      new Uint8Array(
        readFileSync(
          new URL("../target/deploy/pinocchio_vault.so", import.meta.url),
        ),
      ),
    );

    [vaultPda, bump] = await getProgramDerivedAddress({
      programAddress: PROGRAM_ID,
      seeds: [
        new TextEncoder().encode("pinocchio_vault_pda"),
        addrEncoder.encode(PAYER),
      ],
    });

    svm.airdrop(PAYER, 10n * LAMPORTS_PER_SOL);
  });

  afterEach(() => svm.free());

  it("deposit", () => {
    const result = svm.processTransaction(
      [
        {
          programAddress: PROGRAM_ID,
          accounts: IX_ACCOUNTS(vaultPda),
          data: encodeDeposit(1n, bump),
        },
      ],
      [emptySystemAccount(vaultPda)],
    );

    assertSuccess(result);
    expect(svm.getAccount(vaultPda)?.lamports).toBe(lamports(LAMPORTS_PER_SOL));
  });

  it("withdraw", () => {
    svm.airdrop(vaultPda, LAMPORTS_PER_SOL);

    const result = svm.processTransaction(
      [
        {
          programAddress: PROGRAM_ID,
          accounts: IX_ACCOUNTS(vaultPda),
          data: encodeWithdraw(bump),
        },
      ],
      [],
    );

    assertSuccess(result);
    expect(svm.getAccount(vaultPda)?.lamports).toBe(lamports(0n));
  });

  it("deposit + withdraw round-trip", () => {
    const before = svm.getAccount(PAYER)!.lamports;

    const depositResult = svm.processTransaction(
      [
        {
          programAddress: PROGRAM_ID,
          accounts: IX_ACCOUNTS(vaultPda),
          data: encodeDeposit(1n, bump),
        },
      ],
      [emptySystemAccount(vaultPda)],
    );
    assertSuccess(depositResult);

    const withdrawResult = svm.processTransaction(
      [
        {
          programAddress: PROGRAM_ID,
          accounts: IX_ACCOUNTS(vaultPda),
          data: encodeWithdraw(bump),
        },
      ],
      [],
    );
    assertSuccess(withdrawResult);

    expect(svm.getAccount(PAYER)!.lamports).toBe(before);
  });
});
