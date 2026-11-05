# Organised Perfumer

Organised Perfumer is a web app for organising fragrance ingredients, building recipes, saving accords, and reviewing costs, allergen contributions, IFRA information, and GHS screening results.

It runs on your computer using Node.js and opens in your browser. The application uses Nuxt, Vue, Vuetify, JavaScript, and JSON data files.

## Contents

- [Features](#features)
- [What to install](#what-to-install)
- [Download and run](#download-and-run)
- [Using the organiser](#using-the-organiser)
- [GHS screening](#ghs-screening)
- [Settings](#settings)
- [Importing JSON](#importing-json)
- [Saving and backing up your work](#saving-and-backing-up-your-work)
- [Project structure](#project-structure)
- [Build and hosting](#build-and-hosting)
- [Current limitations](#current-limitations)
- [Troubleshooting](#troubleshooting)
- [Reporting issues](#reporting-issues)
- [Support](#support)
- [License](#license)

## Features

- Maintain an ingredient catalogue, sorted alphabetically by name, with CAS numbers, synonyms, INCI names, prices, concentrations, descriptive information, and regulatory metadata.
- Open the same ingredient information dialog from the catalogue's information button or a name in Selected Ingredients.
- Search ingredients and filter by tags or tenacity, with optional searches across descriptions and scent or chemical families.
- Build recipes using ingredients and saved accords, with editable weights, dilutions, and dilutants.
- Preview equivalent ingredient weights for a different batch size.
- Deconstruct diluted accords into their component rows and a separate dilutant row.
- Add custom dilutant options and match them to catalogue ingredients.
- Review recipe totals, cost estimates, allergen contributions, IFRA limits, and GHS screening with source details.
- Save recipes as accords, reuse them in other recipes, and export accords as JSON.
- Manage allergen reference data, IFRA reference data, tags, and dilutant mappings in Settings, including search and complete-list JSON replacement for allergen and IFRA entries.

## What to install

| Requirement | Details |
| --- | --- |
| Computer | Windows, macOS, or Linux. |
| Node.js | Install a maintained **LTS** release from [nodejs.org](https://nodejs.org/en/download). Follow any Node version specified by the repository. |
| npm | Included with the standard Node.js installation; downloads the project's dependencies. |
| Browser | A current version of Chrome, Edge, Firefox, or Safari. |
| Complete project | Download or clone the whole repository, including `package.json`, the data files, and `server/`. |
| Internet connection | Needed to download the project and install dependencies. |

[Visual Studio Code](https://code.visualstudio.com/) is an optional editor that makes opening the project and running a terminal easier. **Git is optional** if you download the project as a ZIP.

You do not need to install Vue, Nuxt, or Vuetify separately. npm installs the versions declared in `package.json`. The current storage system uses JSON files rather than a separate database installation.

## Download and run

### 1. Download the project

On this repository's GitHub page, select **Code → Download ZIP**, then extract the ZIP into a folder you can write to.

Alternatively, if Git is installed, copy the repository's HTTPS URL from the **Code** menu and run:

```bash
git clone <repository-url> organised-perfumer
cd organised-perfumer
```

Replace `<repository-url>` with the copied URL before running the command.

### 2. Open a terminal in the project folder

In Visual Studio Code, select **File → Open Folder**, open the extracted or cloned project, then select **Terminal → New Terminal**.

Run the following commands from the folder containing `package.json`. Do not open individual `.vue` files directly in your browser.

### 3. Check Node.js and npm

After installing Node.js, open a new terminal and run:

```bash
node -v
npm -v
```

Both commands should print a version number. If either command is unavailable, see [Troubleshooting](#troubleshooting).

### 4. Install dependencies

From the project folder, run:

```bash
npm install
```

This creates `node_modules/`. Run it during the initial setup and again when the project's dependencies change. If the repository includes `package-lock.json`, `npm ci` is an alternative for installing the exact locked dependencies.

### 5. Start the app

```bash
npm run dev
```

Open the local address printed in the terminal, usually [http://localhost:3000](http://localhost:3000). If Nuxt selects another port, use that address instead.

Keep the terminal running while using the app. When prompted by the app, read the introductory notice and select **I Agree** to continue.

To stop the app, return to the terminal and press **Ctrl+C**. To use it again later, open the project folder and run `npm run dev`; you do not need to reinstall packages each time.

## Using the organiser

Open **Ingredient Organiser** from the navigation menu. The page contains an ingredient catalogue and an accords table, alongside the selected recipe and four summary panels: Recipe, Allergen, IFRA, and GHS. The side toggle collapses or expands the catalogue area.

### 1. Prepare your ingredients

Use **New Ingredient** to add a material, or use a row's actions to inspect or edit an existing entry. Ingredients are displayed in alphabetical order by name, including after searches, filtering, or adding new entries.

Enter the ingredient's name, CAS number, stock concentration, solvent, and any relevant descriptive or composition information. To calculate its price per gram, enter the purchase price and the purchased quantity **in grams**. Use one currency consistently throughout your catalogue.

An ingredient's **concentration** describes the material as supplied. For example, Jasmine Sambac supplied at 10% in DPG should have a concentration of `10` and a solvent of `DPG`.

Recipe-row **dilution** is a separate input for adding more dilutant while building a recipe. It can be useful when experimenting with materials that are too strong to work with at their stock concentration.

Use the catalogue's information button, or click a name in **Selected Ingredients**, to open the shared ingredient information dialog. It shows basic information and any available allergen or IFRA composition breakdowns. Its IFRA Limit field displays **unrestricted** when no ingredient-level maximum has been entered.

The ingredient editor also accepts EC and EU REACH numbers, GHS classifications and categories, and an SDS reference. Select a GHS H-code and, where available, its category; selections are added automatically. Review these records against the material's supplier data before using the GHS panel.

When adding a composition item, a matching entry in both the Allergen and IFRA reference lists is added to both composition lists at the entered percentage. Check both lists after editing composition data.

Search normally includes name, CAS, synonyms, and INCI. Open **Filters** to include additional fields, require particular tags, or set a tenacity range. Enable **Accords table** if you also want the ingredient search term to filter accords.

### 2. Add ingredients or accords to a recipe

Use a row's add action to place it in **Selected Ingredients**, then enter **Grams added**. A new row starts at zero grams.

For each selected row:

| Field | Meaning |
| --- | --- |
| Grams added | Total mixture weight assigned to this recipe row, including its additional dilutant. |
| Dilution % | Percentage of that row made up of the selected ingredient stock or accord. Blank means 100%. |
| Dilutant | Additional solvent used for the row, such as ETOH, DPG, IPM, BB, TEC, a configured custom option, or Other. |
| % of recipe | Row weight as a percentage of the recipe's total weight. |
| Row cost | Calculated from the ingredient or accord price and, when configured, the added dilutant price. |

**Example:** A row with `10` grams added and `20`% dilution represents 2 g of the selected stock plus 8 g of additional dilutant. If that stock is already 10% active material, the row contains 0.2 g of active material. Stock concentration and recipe-row dilution are separate inputs.

To add a custom dilutant, select **Other**. Enter an option name using letters and numbers, then match it to a catalogue ingredient and select **Confirm**, or choose **Continue without matching**. The option becomes available in the shared dilutant list. Matching is needed for the app to resolve its catalogue price and composition reliably.

### 3. Review the summaries

| Panel | What it shows |
| --- | --- |
| Recipe Summary | Mixture weight, raw ingredient weight, concentration, dilutant percentage, total cost, cost per gram, and an editable **Cost per** amount in grams. |
| Allergen Summary | Calculated allergen concentrations and their contributing sources. Rows below the app's display threshold are greyed out; the copy button copies eligible names at or above the threshold. |
| IFRA Summary | Calculated concentrations against the configured category limits, highlighted exceedances, and a calculated maximum level of use. The copy button copies the table. |
| GHS Summary | Recorded hazard codes evaluated against the app's mixture-screening rules, with contributing sources, review notes, and an expanded information view. See [GHS screening](#ghs-screening). |

Use the information icons in the allergen and IFRA summaries to inspect contributing materials. Click an ingredient's **IFRA R**, **IFRA S**, or **IFRA P** badge to view the associated notes.

Recipe rows and Recipe Summary use the same costing helper. Costs include mapped additional dilutants, and nested accord costs use current ingredient prices. Complete the purchase prices, quantities, and **Settings → Dilutants** mappings for the materials you use.

The current IFRA summary uses **`categoryFour` from `assets/data/ifra51.json`**, together with any ingredient-level maximums entered in the catalogue. **Maximum Level of Use** is calculated from the available numeric limits. It displays **Unrestricted** when IFRA entries are present but none has an available numeric limit. If no IFRA-related ingredients are identified, the entire Maximum Level of Use section is hidden.

The **unrestricted** and **Unrestricted** labels describe the available data; missing entries or limits cannot establish that a recipe is unrestricted. The allergen display currently uses a `0.001%` declaration threshold and does not provide a product-type selector. Its declaration notice is hidden when no displayed allergen meets that threshold.

These panels reflect the recipe entered. If you are entering a concentrate, its displayed percentages describe that concentrate; enter the finished mixture when you need percentages for that mixture. Check the reference data, intended product category, and supplier information before relying on a result.

### 4. Adjust and save a recipe

| Control | Action |
| --- | --- |
| Scale to | Displays proportional equivalent weights for the requested batch size. It leaves the entered grams unchanged. |
| Concentrate | Separates additional row dilutants into their own rows. It does not physically remove solvent or change the underlying stock concentration. |
| Condense | Combines duplicate ingredients and adjusts dilutants; prompts for a dilutant choice when needed. |
| Deconstruct | Separates the accord row's additional dilutant first, then scales the accord's component rows to the remaining accord weight. Saved component dilutions and nested accord references are retained. |
| Save Recipe | Opens a naming dialog and adds the recipe to the Accords table only after a confirmed server save. Failed saves keep the dialog and draft open with an error message. |
| Clear Recipe | Removes the selected recipe rows after confirmation. |

After **Save Recipe**, enter a name and select **Add to Accords**. You can add this accord to another recipe as a single row or deconstruct it to work with its components.

**Deconstruction example:** A 100 g accord row at 10% dilution in ETOH becomes components representing 10 g of accord plus a separate 90 g ETOH row. When a dilution below 100% has no dilutant, the confirmation dialog warns that ETOH will be used if you continue. A blank dilution is treated as 100%, so a selected dilutant adds no extra solvent in that case. A custom dilutant entered through **Other** also needs a name; otherwise the ETOH fallback applies.

Use **Save JSON** in the Accords table to download a portable backup. Saving a recipe to the table and downloading JSON are separate actions.

## GHS screening

The GHS panel is intended for screening liquid mixtures using the app's Australian GHS 7 rule set. Read its supplier-SDS notice and select **I Understand** to reveal the panel. Treat its results as a guide and double-check the source data and outputs against the relevant supplier SDS.

| Display | Meaning in the app |
| --- | --- |
| Grey row | Below the criteria evaluated by the current rule set. |
| Yellow row | Requires review or more data; the app cannot make an unqualified assessment from the recorded information. |
| Information icon | Shows the calculation explanation and contributing materials, CAS numbers, and percentages of the complete formula. |
| Copy button | Copies the GHS table with codes, hazard statements, and app notes, including notes for rows below the evaluated criteria. |
| Expand button | Opens **GHS Information**, with Section 2 and Section 3 review tables and data checks. |

In the expanded view, **SDS Section 2 Summary** shows the screening results and app notes. **SDS Section 3 Summary** shows calculated formula composition in % w/w, including dilutants. Additional sections identify missing GHS data, supplier-data issues, and M-factor assumptions when present. These are review tables, not a complete SDS.

GHS information comes from the ingredient's separate classification data. Filling in `allergenList` or `ifraList` alone does not supply GHS classifications. Record H-codes and their categories in the ingredient editor, using supplier information for the actual stock you have.

Where supplied in JSON, `ghsClassificationBasis` distinguishes classifications for **neat** material from **stock** or **as-supplied** material. If the basis of a diluted stock's classification is unspecified, the app can show a concentration range covering both interpretations. Unresolved supplier-data issues are treated as unconfirmed contributions.

Missing aquatic M-factors currently use a fallback of **M = 1**, with the assumption listed in the expanded view; supplied factors take priority. Related hazard codes are consolidated by the app's precedence rules where applicable, so the summary is not a direct one-row-per-ingredient-code list. Inspect the calculation and source notes when reviewing a result.

**No recorded GHS codes** describes the available records. It does not establish that a formula is non-hazardous. Check the missing-data and supplier-data sections, and replace incomplete or sample values before relying on a result.

## Settings

Open **Settings**, select a tab, make your changes, and use that tab's **Save** button. Check for a successful save message.

| Tab | Purpose |
| --- | --- |
| Dilutants | Add or edit dilutant option names and match them to catalogue ingredients so calculations can resolve their identities, composition, and costs. |
| Allergens | Maintain reference names, INCI names, and CAS numbers. Multiple CAS numbers can be entered with semicolons. |
| IFRA | Maintain reference names, INCI names, CAS numbers, recommendations, category limits, and supporting notes. R means Restriction, S means Specification, and P means Prohibition. |
| Tags | Maintain the available ingredient tags. |

The **Allergens** and **IFRA** tabs provide a search by name or CAS, **New Entry** to add a record, and **Replace JSON** to replace that tab's entire reference list. The dialog warns that existing entries and unsaved edits will be replaced. After confirming a replacement or making edits, select **Save** to write the changes to the reference file. See [Allergen and IFRA reference data](#allergen-and-ifra-reference-data) for details.

In **Dilutants**, use unique option names containing letters and numbers; **Other** is reserved for the custom-dilutant dialog. The table includes a blank row for another option. Pressing **Tab** from the matched-ingredient field in the final row adds and focuses a new row. Dilutant options and mappings are shared across the app and cached in the current browser. **Save** also sends the list to the server file.

Allergen and IFRA reference entries identify substances and limits. An ingredient's own `allergenList` and `ifraList` describe its composition and must also be populated where applicable.

## Importing JSON

### Ingredients

Select **Import JSON** in the Ingredients table, then choose or drop a `.json` file. Accepted formats are an array of ingredient objects or an object containing an `items` array.

This lemon oil example demonstrates the catalogue and composition structure. All prices and composition values below are illustrative; replace them with your own ingredient and supplier data.

```json
[
  {
    "id": "ch451n6",
    "key": "ch451n6",
    "name": "Lemon Essential Oil",
    "cas": "8008-56-8",
    "concentration": 100,
    "price": 10,
    "quantity": 25,
    "tags": [
      "citrus",
      "top note"
    ],
    "isAllergen": false,
    "allergenList": [
      {
        "cas": "5989-27-5",
        "name": "Limonene",
        "concentration": 72
      },
      {
        "cas": "5392-40-5",
        "name": "Citral",
        "concentration": 3.5
      },
      {
        "cas": "106-24-1",
        "name": "Geraniol",
        "concentration": 0.1
      },
      {
        "cas": "78-70-6",
        "name": "Linalool",
        "concentration": 0.5
      },
      {
        "cas": "106-22-9",
        "name": "Citronellol",
        "concentration": 0.03
      }
    ],
    "ifraList": [
      {
        "cas": "5989-27-5",
        "name": "Limonene",
        "concentration": 72
      },
      {
        "cas": "5392-40-5",
        "name": "Citral",
        "concentration": 3.5
      },
      {
        "cas": "106-24-1",
        "name": "Geraniol",
        "concentration": 0.1
      },
      {
        "cas": "78-70-6",
        "name": "Linalool",
        "concentration": 0.5
      },
      {
        "cas": "106-22-9",
        "name": "Citronellol",
        "concentration": 0.03
      }
    ]
  }
]
```

In this app, `isAllergen: true` counts the entire material as an allergen **in addition to** any constituents in its `allergenList`. The mixture example uses `false` so that only its listed constituents are counted. Set the flag according to how the material should be represented in your catalogue.

An empty composition list means no composition data has been supplied; it does not establish the absence of allergens or restricted substances.

Use `name` for the ingredient name, percentages such as `10` for 10%, and numeric values for prices and quantities. Give every record a unique, stable `id` and `key`. Different suppliers or stock strengths can share a CAS number, so CAS alone is not a unique catalogue identifier.

Imports merge with the current catalogue. Existing records take precedence when the importer detects a matching identity; use the edit action to update an existing record. Importing changes the working catalogue and its browser cache; it does not bulk-write the imported catalogue to `ingredients.json`.

### Accords

Use **Import JSON** in the Accords table to select one or more exported accord files, review the selected files, and confirm the import. Accord files must contain an array of accord records, such as the output from **Save JSON**.

Existing accord identities take precedence when merging. Importing updates the current table; it does not bulk-save every imported accord to the server file. Download a backup before leaving the page if the imported accords have not been saved elsewhere.

Keep the corresponding ingredient catalogue and any referenced nested accords with an accord backup. Accord recipes contain references to those records, so an accord export alone is not a complete backup of every ingredient it uses.

### Allergen and IFRA reference data

Open **Settings → Allergens** or **Settings → IFRA**, select **Replace JSON**, choose or drop the reference files, review the replacement warning, and confirm. Accepted formats are an array of reference entries or an object containing an `items` array. Entries need a name or CAS number so they can be recognised.

Allergen entries can include `name`, `inci`, and `cas`. IFRA entries can also include `recommendation`, category fields such as `categoryFour`, and supporting notes. Use the reference-data format expected by the corresponding tab, rather than an ingredient or accord export.

**This replaces the entire selected reference list, including unsaved edits. It does not merge with existing entries.** Only entries from the chosen files remain in the working table after confirmation. Use **New Entry** or edit the existing rows for smaller changes. Keep a copy of the reference JSON before replacement, then select the tab's **Save** button to persist the new list.

## Saving and backing up your work

The app uses both server-side files and browser storage:

| Data or action | Storage behaviour |
| --- | --- |
| Ingredient create, edit, or delete | Uses `/api/ingredients` to update `assets/data/ingredients.json`, alongside the working UI state. |
| Save Recipe and accord edits/deletions | Use `/api/accords` to update `assets/data/accords.json`. |
| Settings Save | Uses `/api/settings-data` to update the selected reference JSON file. |
| Current selected recipe | Automatically cached in the current browser's local storage. |
| Working ingredient catalogue, including imports | Cached in browser local storage, associated with the bundled catalogue's identity signature. |
| Dilutant options and mappings | Shared across the current app and cached in browser local storage; Settings Save also sends them to `assets/data/dilutants.json`. |
| Accords Save JSON | Downloads a JSON file to your computer. |

Ingredient create/edit and Save Recipe dialogs show an error and retain the draft when a save is not confirmed. New or edited ingredients and newly saved recipes update the visible tables only after a successful save. JSON imports follow the separate working-table behaviour described above, so keep exported and file-based backups of important work.

These file-save behaviours assume a local server with writable data files. A hosted sample deployment may not support the file-backed API operations. Treat it as a demonstration rather than a place to keep important work; see [Build and hosting](#build-and-hosting).

Browser storage is specific to the browser profile and site address, including its port. It does not sync between computers; clearing site data or using a different address can remove or hide the cached recipe. The ingredient cache can also be invalidated when the bundled catalogue identities change.

For a durable backup:

1. Save an important working recipe as an accord and export it with **Save JSON**.
2. Copy the complete `assets/data/` folder to a separate backup location after confirming file saves succeeded.
3. Keep the original files used for imports; browser-only imports may not yet exist in the server-side JSON files.

To move to another computer, copy the project and backups, install Node.js, run `npm install`, and start the app. Restore or reimport your data as needed. Browser local storage does not move with the project folder.

## Project structure

| Path | Purpose |
| --- | --- |
| `package.json` | Dependencies and npm scripts. |
| `nuxt.config.js` | Nuxt configuration. |
| `app.vue` | Application shell and navigation. |
| `pages/ingredient-organiser.vue` | Main organiser page. |
| `pages/settings.vue` | Settings page. |
| `components/IngredientsTable.vue` | Ingredient catalogue, search, import, and editing. |
| `components/IngredientInfoDialog.vue` | Shared information dialog opened from the ingredient catalogue and selected recipe. |
| `components/AccordsTable.vue` | Accord management, import, and export. |
| `components/SelectedTable.vue` | Recipe rows, dilution controls, and recipe saving. |
| `components/RecipeSummary.vue`, `AllergenSummary.vue`, `IFRASummary.vue` | Recipe calculations and summary panels. |
| `components/GHSSummary.vue`, `GHSClassificationTable.vue` | GHS screening panel, shared hazard table, source explanations, and expanded review information. |
| `components/DilutantSelect.vue` | Dilutant selection and the custom-dilutant dialog. |
| `components/JsonUploadDialog.vue` | Shared JSON file selection, validation, and confirmation dialog. |
| `composables/useDilutants.js` | Shared dilutant options, ingredient mappings, browser cache, and composition lookups. |
| `plugins/vuetify.js` | Vuetify setup, theme, and icons. |
| `utils/` | Shared calculation and composition helpers. |
| `utils/recipeCostHelpers.js` | Shared costing for recipe rows, Recipe Summary, and newly saved recipe snapshots, including additional dilutants and nested accords. |
| `utils/ghsHelpers.js` | GHS source expansion, formula-composition review, data checks, and statement consolidation. |
| `utils/ghsMixtureRules.js` | The app's mixture-screening rules and assessment notes. |
| `server/api/` | JSON reading and writing endpoints. |
| `assets/data/ingredients.json` | Ingredient catalogue. |
| `assets/data/accords.json` | Saved accords and recipes. |
| `assets/data/allergens.json` | Allergen reference list. |
| `assets/data/ifra51.json` | IFRA reference data used by the current app. |
| `assets/data/dilutants.json` | Dilutant-to-ingredient mappings. |
| `assets/data/tags.json` | Tag options. |
| `assets/data/ghs.json`, `assets/data/pCodes.json` | Supporting hazard reference data. |
| `LICENSE` | MIT License and copyright notice. |

Preserve the repository's existing directory layout. In particular, server routes must be actual JavaScript files, such as `server/api/settings-data.post.js`, without an extra `.json` extension.

## Build and hosting

For everyday local use and JSON editing, use `npm run dev`.

To build the application and preview the build locally:

```bash
npm run build
npm run preview
```

Previewing a production build does not change the storage model. Several reference files are imported into the application at build time; changing the on-disk JSON afterwards does not automatically refresh those bundled copies. Rebuild when necessary.

**Putting the source on GitHub does not require deploying the app.** Users can download the repository and run it locally. GitHub Pages serves static files and cannot run the current Nuxt file-writing endpoints, so it cannot provide the full saving workflow by itself.

### Hosted sample site

A hosted sample site is intended for people to explore the interface and calculations using demonstration data. It does not need permanent server-side writes for that purpose. Browser caches and JSON downloads, where available, are separate from server-file persistence.

On serverless hosts such as Netlify, the current file-backed API operations may fail or may not provide durable storage. This can affect loading or saving accords, saving ingredients, and saving Settings. A failed save can leave its dialog open with an error, as designed. The app has not been converted into a cloud-synchronised data service.

For a Git-connected Netlify deployment using Nuxt's Netlify preset, use the project folder containing `package.json` as the base directory, `npm run build` as the build command, and `dist` as the publish directory. See the [Netlify Nuxt guide](https://docs.netlify.com/build/frameworks/framework-setup-guides/nuxt/) for provider setup. Only publish sample/reference data you intend visitors to access.

For a hosted service that persists users' changes, replace the file-writing backend with durable storage, add authentication and access controls, and keep runtime data and displayed data in sync. See [Nuxt deployment documentation](https://nuxt.com/docs/4.x/getting-started/deployment).

Before publishing a repository, include the complete source and required sample/reference data, retain its dependency lockfile, and exclude generated directories such as `node_modules/`, `.nuxt/`, and `.output/`. Review `assets/data/` for private formulas, supplier pricing, or other information you do not intend to publish; some of this data is also bundled into the client application.

## Current limitations

- The IFRA summary is wired to Category 4 and the supplied `ifra51.json` dataset. The app does not automatically download amendments or verify that the data is current or complete.
- The allergen display uses a fixed threshold rather than selecting thresholds by product type.
- GHS results are screening outputs from the recorded data and implemented rules. Missing classifications, categories, classification basis, M-factors, or supplier information can leave results incomplete or provisional. The Section 2 and Section 3 views do not generate a complete SDS.
- Bundled catalogue and example values are sample/reference data. Replace prices, composition, and hazard data with information for your actual materials before relying on the calculations.
- Saved formulas depend on their ingredient and accord references being available.
- Browser caches and imported tables are not a replacement for exported or file-based backups.
- Hosted demonstrations do not provide a reliable place to save permanent work through the current file-backed APIs.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| `node` or `npm` is not recognised | Install Node.js LTS, reopen the terminal, and check `node -v` and `npm -v`. |
| PowerShell blocks `npm.ps1` | Use Command Prompt, or use `npm.cmd` in place of `npm` in the documented commands. |
| `package.json` cannot be found | Open a terminal in the project root, not in `pages/`, `components/`, or an outer ZIP extraction folder. |
| Dependencies are missing | Run `npm install` in the project root, then restart `npm run dev`. |
| Import of `@/utils/recipeCostHelpers.js` cannot be resolved | Include `utils/recipeCostHelpers.js` at its original path in the complete project, then restart Nuxt. |
| A new component or helper import cannot be resolved | Include all current files, including the shared information dialog, dilutant composable, and GHS helpers listed above. Preserve their filenames and folder paths. |
| The page does not open | Keep the server terminal running and use its exact printed address and port. |
| Save fails or changes disappear | Check that `server/api/` is included, the routes have their correct `.js` names, and `assets/data/` is writable. Check terminal and browser-console errors. |
| Saving fails on the hosted sample site | Its host may not support the current file-writing APIs. Run the app locally for the file-based workflow and keep JSON backups where export is available. |
| Imported data disappears | Imports may only be in the working table or browser cache. Keep the input file and export accords before navigating away. |
| JSON import is rejected | Use a `.json` file with the correct structure for ingredients, accords, or the selected Settings reference list. JSON needs double quotes and does not allow comments or trailing commas. |
| Settings entries disappear after Replace JSON | Replacement intentionally discards the previous list and unsaved edits. Restore the intended list from a reference-file backup if needed. |
| Costs are zero or unexpected | Check the purchase price, quantity in grams, row dilution, and Settings → Dilutants mappings. Additional dilutants need a mapped ingredient with usable price and quantity values. |
| An allergen or IFRA entry is missing | Check CAS matching, reference records, and the ingredient's composition lists. An empty summary does not establish that the recipe has no relevant substances. |
| GHS rows are grey or yellow | Use the information icons and expanded GHS view to inspect the evaluated criteria, source contributions, missing data, M-factor assumptions, and supplier-data issues. |
| GHS source percentages appear as a range | Check whether the recorded classification applies to neat material or the supplied stock. An unspecified basis for diluted stock can produce a range. |
| Old data remains after a source edit | Restart Nuxt and refresh the browser. Export important work before clearing any site storage. |

After adding or replacing API files, restart the development server. After editing JSON manually, check its syntax with a plain-text or code editor before restarting.

For a stale ingredient cache, first preserve any browser-only work and confirm that `assets/data/ingredients.json` contains the intended catalogue. Then, if needed, run this in the browser's developer console and refresh:

```js
localStorage.removeItem("ingredientOrganiser.ingredients.v1")
```

This removes the cached ingredient catalogue. Avoid clearing all site storage as a routine fix, because it can also remove the current recipe.

## Reporting issues

When reporting a problem, include your operating system, browser, Node.js version, the steps to reproduce it, and the relevant terminal or browser-console error. Use a small sample recipe or JSON file with confidential information removed.

Useful references: [Node.js downloads](https://nodejs.org/en/download), [npm installation help](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm/), and [Nuxt documentation](https://nuxt.com/docs/4.x/getting-started/introduction).

## Support

Support Chasing Scents at [chasingscents.com](https://chasingscents.com).

Follow [@chasingscents](https://instagram.com/chasingscents) on Instagram.

## License

Released under the [MIT License](LICENSE).

Copyright (c) 2026 chasingscents

See `LICENSE` for the full terms and warranty disclaimer.
