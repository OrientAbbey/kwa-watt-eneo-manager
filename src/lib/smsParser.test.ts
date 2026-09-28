import { describe, it, expect } from "vitest";
import { parseRechargeSms, parsedFieldCount } from "./smsParser";

// Les SMS ci-dessous sont des exemples SYNTHÉTIQUES de format plausible, pas des reproductions exactes des opérateurs :
// l'analyseur est volontairement tolérant et le résultat est toujours relu par l'utilisateur.
describe("parseRechargeSms", () => {
  it("lit montant, référence Orange Money et date", () => {
    const p = parseRechargeSms("Paiement de facture ENEO reussi. Montant: 5 000 FCFA. ID Transaction: BP260115.1234.A98765. Le 15/01/2026 a 10:32");
    expect(p.montant).toBe(5000);
    expect(p.transactionRef).toBe("BP260115.1234.A98765");
    expect(p.date).toBe("2026-01-15");
  });

  it("lit les kWh et le jeton à 20 chiffres", () => {
    const p = parseRechargeSms("Votre jeton: 1234 5678 9012 3456 7890. Energie: 63,5 kWh. Montant 3000 F CFA");
    expect(p.token).toBe("12345678901234567890");
    expect(p.kwh).toBe(63.5);
    expect(p.montant).toBe(3000);
  });

  it("gère les milliers avec point ou virgule et les dates ISO", () => {
    expect(parseRechargeSms("Vous avez paye 10.000 XAF le 2026-02-03").montant).toBe(10000);
    expect(parseRechargeSms("Vous avez paye 1,500 FCFA").montant).toBe(1500);
    expect(parseRechargeSms("le 2026-02-03").date).toBe("2026-02-03");
  });

  it("lit une référence MTN libellée", () => {
    expect(parseRechargeSms("Financial Transaction Id: 1234567890. Montant 2000 FCFA").transactionRef).toBe("1234567890");
  });

  it("rejette les dates impossibles", () => {
    expect(parseRechargeSms("le 31/02/2026").date).toBeUndefined();
    expect(parseRechargeSms("le 45/13/2026").date).toBeUndefined();
  });

  it("ne renvoie rien d'inventé pour un texte sans rapport", () => {
    const p = parseRechargeSms("Bonjour, on se voit demain à 18h.");
    expect(p).toEqual({});
    expect(parsedFieldCount(p)).toBe(0);
  });

  it("compte les champs reconnus", () => {
    expect(parsedFieldCount(parseRechargeSms("Montant 5000 FCFA le 15/01/2026"))).toBe(2);
  });
});
