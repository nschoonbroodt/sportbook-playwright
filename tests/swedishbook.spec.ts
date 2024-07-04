import { test, expect } from "@playwright/test";
import exp from "constants";

type Class = {
  day: string;
  time: string;
  location: string;
  classtype: string;
  account: string[];
};

type Account = {
  login: string;
  password: string;
};

function dayStringToNumber(day: string) {
  switch (day) {
    case "Dimanche":
      return 0;
    case "Lundi":
      return 1;
    case "Mardi":
      return 2;
    case "Mercredi":
      return 3;
    case "Jeudi":
      return 4;
    case "Vendredi":
      return 5;
    case "Samedi":
      return 6;
  }
  throw new Error("Invalid day of week " + day);
}

function numberToDayString(dayNumber: number) {
  switch (dayNumber) {
    case 0:
      return "Dimanche";
    case 1:
      return "Lundi";
    case 2:
      return "Mardi";
    case 3:
      return "Mercredi";
    case 4:
      return "Jeudi";
    case 5:
      return "Vendredi";
    case 6:
      return "Samedi";
  }
  throw new Error("Invalid day of week " + dayNumber);
}

test("test", async ({ page }) => {
  // check that we have acces to account credential
  const accounts_str = process.env.ACCOUNTS_SECRET;
  expect(accounts_str, "ACCOUNTS_SECRET var not set").toBeDefined();
  let accounts: Account[] = JSON.parse(accounts_str + "");

  // Find the classes to book on +6 days from today
  const today = new Date().getDay();
  const yesterday = (today + 6) % 7;

  const classes: Class[] = require("../config/classes.json");
  for (const c of classes) {
    // only book for day+6
    const class_day = dayStringToNumber(c.day);
    if (class_day != yesterday) {
      continue;
    }

    // we have one class to book!
    test.info().annotations.push({
      type: "Class to book",
      description: JSON.stringify(c),
    });
    // search for class url
    await page.goto("https://www.swedishfit.fr/cours/list/");
    await page.getByTitle(numberToDayString(today)).click();
    await page.getByRole("treeitem", { name: c.day }).click();
    await page.getByTitle("Toutes les activités").click();
    await page.getByRole("treeitem", { name: c.classtype }).first().click();
    await page.getByTitle("Toutes les salles").click();
    await page.getByRole("treeitem", { name: c.location }).click();
    const row = await page.locator("tr:has-text('" + c.time + "')").first();
    const class_url = await row
      .locator("td.details>a")
      .first()
      .getAttribute("href");
    expect(class_url, "Did not find the class url").not.toBeNull();

    for (const account of c.account) {
      // do we have credential?
      const secrets = accounts.find((e) => (e.login = account));
      expect(secrets, "Did not find account " + account).toBeDefined();

      // login
      if (secrets) {
        await page.getByRole("link", { name: "Mon compte" }).click();
        await page.getByLabel("Adresse email").click();
        await page.getByLabel("Adresse email").fill(secrets.login);
        await page.getByLabel("Adresse email").press("Tab");
        await page.getByLabel("Mot de passe").fill(secrets.password);
        await page.getByRole("button", { name: "S'identifier" }).click();

        await page.goto(class_url + "");
        await page.getByRole("link", { name: "RÉSERVER" }).click();
        await page.getByRole("button", { name: "Réserver" }).click();

        await page.goto("https://www.swedishfit.fr/logout/");
      }
    }
  }

  //await page.goto("https://www.swedishfit.fr/");
  expect(true).toBe(true);
});
