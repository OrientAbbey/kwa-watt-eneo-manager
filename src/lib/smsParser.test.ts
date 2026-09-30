import { describe, it, expect } from "vitest";
import { parseRechargeSms, parsedFieldCount, findMeterByNumber, normalizeSmsText } from "./smsParser";

// Les 3 SMS ci-dessous sont des messages RÉELS fournis par l'utilisateur (Orange Money puis MTN MoMo), reproduits tels quels.
const ORANGE_PAIEMENT = `Paiement ENEO PREPAID réussi par 690000000 
. 
 ID Transaction: PS260925.1823.C00001; 
 N' Compteur: 01234567852; 
 Montant: 3000 FCFA; 
 Balance/generer Kwh: 38.0; 
 TVA: 0 FCFA; Frais: 100 FCFA; 
 Dette: 0 FCFA; 
 Token: 1111-2222-3333-4444-5555. 
 Appeler le 8010 pour le support.`;

const ORANGE_CONSULTATION = `Consultation Token Eneo Prepaiement reussi par 690000000  
Token : 1111-2222-3333-4444-5555  
KWH Genere: 38  
Montant : 3000 FCFA  
N' de Compteur : 01234567852
Date de prepaiement : 25/09/2026.  
  
Orange Money vous remercie`;

const MTN_PAIEMENT = `Paiement ENEO reussi par JEAN EXEMPLE,237690000000: Transaction ID 10000000001, Recu No 000000012345678, Compteur No 98765432109, Token 6666-7777-8888-9999-0000. Energie kWh : 40.0 Prix:2000 F Paiement : 2000 F Frais : 100 F TVA : 0 F Dette : 0 F. Appelez le 8010 pour assistance.`;

describe("SMS réel Orange Money — Paiement ENEO PREPAID", () => {
  const p = parseRechargeSms(ORANGE_PAIEMENT);
  it("lit montant, kWh, compteur et référence", () => {
    expect(p.montant).toBe(3000);
    expect(p.kwh).toBe(38);
    expect(p.meterNumber).toBe("01234567852");
    expect(p.transactionRef).toBe("PS260925.1823.C00001");
  });
  it("sépare les frais du montant", () => {
    expect(p.fees).toBe(100);
    expect(p.tva).toBe(0);
    expect(p.dette).toBe(0);
  });
  it("déduit la date 25/09/2026 de la référence (format AAMMJJ)", () => {
    expect(p.date).toBe("2026-09-25");
    expect(p.dateSource).toBe("reference");
  });
  it("extrait le jeton à 20 chiffres sans confondre avec autre chose", () => {
    expect(p.token).toBe("11112222333344445555");
  });
  it("n'extrait ni le nom ni le téléphone du payeur", () => {
    expect(JSON.stringify(p)).not.toContain("690000000");
  });
});

describe("SMS réel Orange Money — Consultation Token", () => {
  const p = parseRechargeSms(ORANGE_CONSULTATION);
  it("lit les champs de ce format différent", () => {
    expect(p.montant).toBe(3000);
    expect(p.kwh).toBe(38);
    expect(p.meterNumber).toBe("01234567852");
    expect(p.token).toBe("11112222333344445555");
  });
  it("lit la date écrite dans le message", () => {
    expect(p.date).toBe("2026-09-25");
    expect(p.dateSource).toBe("message");
  });
  it("n'invente pas de référence ni de frais absents du message", () => {
    expect(p.transactionRef).toBeUndefined();
    expect(p.fees).toBeUndefined();
  });
});

describe("SMS réel MTN MoMo — Paiement ENEO", () => {
  const p = parseRechargeSms(MTN_PAIEMENT);
  it("prend « Prix » comme montant d'énergie (pas les frais)", () => {
    expect(p.montant).toBe(2000);
    expect(p.fees).toBe(100);
  });
  it("lit kWh, compteur, référence MTN et numéro de reçu", () => {
    expect(p.kwh).toBe(40);
    expect(p.meterNumber).toBe("98765432109");
    expect(p.transactionRef).toBe("10000000001");
    expect(p.receiptNo).toBe("000000012345678");
  });
  it("lit le jeton et ne déduit aucune date (aucune n'est dans ce SMS)", () => {
    expect(p.token).toBe("66667777888899990000");
    expect(p.date).toBeUndefined();
  });
  it("n'extrait pas le téléphone ni le nom du payeur", () => {
    const s = JSON.stringify(p);
    expect(s).not.toContain("237690000000");
    expect(s).not.toContain("JEAN");
  });
});

describe("robustesse au bruit d'OCR", () => {
  it("corrige O/l/I confondus avec des chiffres dans les champs numériques", () => {
    const p = parseRechargeSms("Montant: 3OOO FCFA; N' Compteur: O1234567852; Frais: 1OO FCFA; Token: l111-2222-3333-4444-5555.");
    expect(p.montant).toBe(3000);
    expect(p.meterNumber).toBe("01234567852");
    expect(p.fees).toBe(100);
    expect(p.token).toBe("11112222333344445555");
  });
  it("accepte les séparateurs de milliers et des espaces parasites", () => {
    expect(parseRechargeSms("Montant : 10 000 FCFA").montant).toBe(10000);
    expect(parseRechargeSms("Montant : 10.000 FCFA").montant).toBe(10000);
    expect(parseRechargeSms("Montant   :   2500   FCFA").montant).toBe(2500);
  });
  it("accepte les apostrophes et accents variés", () => {
    expect(parseRechargeSms("N’ Compteur : 01234567852").meterNumber).toBe("01234567852");
    expect(parseRechargeSms("N° Compteur: 01234567852").meterNumber).toBe("01234567852");
    expect(parseRechargeSms("Énergie kWh : 12,5").kwh).toBe(12.5);
  });
  it("lit un « O » isolé comme un zéro (TVA / dette / frais)", () => {
    const p = parseRechargeSms("TVA: O FCFA; Frais: 1OO FCFA; Dette: O FCFA;");
    expect(p.tva).toBe(0);
    expect(p.fees).toBe(100);
    expect(p.dette).toBe(0);
  });
  it("ne prend pas un mot ressemblant à un nombre pour un montant", () => {
    expect(parseRechargeSms("Montant: lol FCFA").montant).toBeUndefined();
  });
  it("ne confond pas « Paiement ENEO réussi » avec un montant", () => {
    expect(parseRechargeSms("Paiement ENEO reussi par 12345678").montant).toBeUndefined();
  });
  it("retombe sur « N FCFA » si aucun libellé, en ignorant frais/TVA/dette", () => {
    expect(parseRechargeSms("Frais: 100 FCFA. Vous avez recharge 5000 FCFA").montant).toBe(5000);
  });
});

describe("cas limites", () => {
  it("texte vide ou sans rapport", () => {
    expect(parseRechargeSms("")).toEqual({});
    expect(parseRechargeSms("Bonjour, on se voit demain à 18h.")).toEqual({});
  });
  it("rejette une date impossible", () => {
    expect(parseRechargeSms("Date : 31/02/2026").date).toBeUndefined();
  });
  it("ignore une référence dont la date serait invalide", () => {
    expect(parseRechargeSms("ID Transaction: PS269925.1823.C00001").date).toBeUndefined();
  });
  it("compte les champs reconnus (montant, kWh, date, référence)", () => {
    expect(parsedFieldCount(parseRechargeSms(ORANGE_PAIEMENT))).toBe(4);
    expect(parsedFieldCount(parseRechargeSms(MTN_PAIEMENT))).toBe(3);
    expect(parsedFieldCount({})).toBe(0);
  });
  it("normalise le texte (accents, espaces insécables)", () => {
    expect(normalizeSmsText("Montant\u00a0:\u202f3000  FCFA\n réussi")).toBe("Montant : 3000 FCFA reussi");
  });
});

describe("findMeterByNumber", () => {
  const meters = [
    { id: "a", profile: { meterNumber: "0123 4567 852" } },
    { id: "b", profile: { meterNumber: "98765432109" } },
    { id: "c", profile: { meterNumber: "" } },
  ];
  it("retrouve un compteur malgré espaces/tirets", () => {
    expect(findMeterByNumber(meters, "01234567852")?.id).toBe("a");
    expect(findMeterByNumber(meters, "98765432109")?.id).toBe("b");
  });
  it("ne renvoie rien pour un numéro inconnu, vide ou trop court", () => {
    expect(findMeterByNumber(meters, "99999999999")).toBeUndefined();
    expect(findMeterByNumber(meters, "")).toBeUndefined();
    expect(findMeterByNumber(meters, "123")).toBeUndefined();
  });
});
