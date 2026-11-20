import { TestCardNumber } from "./payments.config"

export type ChargeInput={
    testCard:TestCardNumber,
    amountCents:number;
    reference:string
}

export type ChargeResult = 
    | {ok:true,transactionId:string}
    | {ok:false,reason:string}

export interface PaymentProvider {
  charge(input: ChargeInput): Promise<ChargeResult>;
}