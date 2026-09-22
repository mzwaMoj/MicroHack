import { randomUUID } from 'crypto';
import { generateURI, verifySync } from 'otplib';
import QRCode from 'qrcode';
import { PaymentSetup, SimulatedPaymentMethod } from '../models/payment';
import { PaymentConfigurationError, ValidationError } from '../utils/errors';

export interface SimulatedAuthorization {
  approved: boolean;
  provider: 'simulated';
  providerReference: string;
}

const getConfiguration = () => {
  const enabled = process.env.PAYMENT_SIMULATION_ENABLED === 'true';
  const secret = process.env.PAYMENT_TOTP_SECRET?.replace(/\s/g, '').toUpperCase();
  const issuer = process.env.PAYMENT_TOTP_ISSUER?.trim() || 'OctoCAT Supply Demo';

  if (!enabled || !secret || !/^[A-Z2-7]+$/.test(secret) || secret.length < 26) {
    throw new PaymentConfigurationError();
  }

  return { secret, issuer };
};

export async function getPaymentSetup(branchId: number): Promise<PaymentSetup> {
  const { secret, issuer } = getConfiguration();
  const accountName = `branch-${branchId}`;
  const uri = generateURI({ issuer, label: accountName, secret });

  return {
    issuer,
    accountName,
    qrCodeDataUrl: await QRCode.toDataURL(uri, { errorCorrectionLevel: 'M', margin: 1, width: 240 }),
    manualEntryKey: secret,
  };
}

export function verifyPaymentOtp(otp: string): void {
  const { secret } = getConfiguration();
  const verification = /^\d{6}$/.test(otp)
    ? verifySync({ token: otp, secret, epochTolerance: 30 })
    : { valid: false };
  if (!verification.valid) {
    throw new ValidationError('The authentication code is invalid or expired');
  }
}

export function authorizeSimulatedPayment(method: SimulatedPaymentMethod): SimulatedAuthorization {
  getConfiguration();
  return {
    approved: method === 'demo-card-approved',
    provider: 'simulated',
    providerReference: `sim_${randomUUID()}`,
  };
}