<!-- components/IngredientsTable.vue -->
<template>
  <v-card class="pa-3 h-100 d-flex flex-column" style="height: 100%;" color="card">
    <!-- HEADER ROW: Title + Filters/Import/Add Ingredient buttons -->
    <div class="d-flex align-center justify-space-between mb-2 ingredients-toolbar">
      <h2 class="text-h6">Ingredients [{{ filteredItems.length }}]</h2>

      <div class="d-flex ga-2 ingredients-toolbar-actions">
        <div class="filter-toggle-wrap" :class="{ 'is-open': showFilters }">
          <v-btn
            size="small"
            variant="flat"
            class="filter-toggle-btn"
            @click="showFilters = !showFilters"
            color="btnSubtle"
          >
            <span class="filter-label filters-label">Filters</span>
            <span class="filter-label hide-filters-label">Hide Filters</span>
          </v-btn>
        </div>

        <v-btn size="small" color="btnImport" variant="flat" @click="openLoadDialog">
          Import JSON
        </v-btn>

        <v-btn size="small" color="btnAdd" variant="flat" @click="openAddDialog">
          New Ingredient
        </v-btn>
      </div>
    </div>

    <v-scroll-y-transition>
      <div
        v-if="showFilters"
        class="ingredient-filters-panel mb-3 bg-bgSubtle"
      >
        <div class="text-subtitle-2 font-weight-medium mb-2">Filters</div>

        <div class="filters-grid">
        <div class="filter-section">
          <div class="text-caption font-weight-medium mb-1">Apply search to include:</div>
          <div class="d-flex flex-wrap ga-2">
            <v-checkbox
              v-model="searchInclude.tags"
              label="tags"
              density="compact"
              hide-details
            />
            <v-checkbox
              v-model="searchInclude.description"
              label="description"
              density="compact"
              hide-details
            />
            <v-checkbox
              v-model="searchInclude.scentFamily"
              label="scent family"
              density="compact"
              hide-details
            />
            <v-checkbox
              v-model="searchInclude.chemicalFamily"
              label="chemical family"
              density="compact"
              hide-details
            />
            <v-checkbox
              v-model="filterAccordsTable"
              label="Accords table"
              density="compact"
              hide-details
            />
          </div>
        </div>

        <div class="filter-section">
          <div class="text-caption font-weight-medium mb-1">Must contain tags:</div>
          <v-autocomplete
            v-model="selectedFilterTags"
            :items="tagFilterOptions"
            item-title="title"
            item-value="value"
            label="Tags"
            density="compact"
            variant="outlined"
            multiple
            chips
            closable-chips
            clearable
            hide-details
          >
            <template #item="{ props: itemProps, item }">
              <v-list-item v-bind="itemProps" :title="item.raw?.title || item.title">
                <template #prepend="{ isActive }">
                  <v-checkbox-btn :model-value="isActive" />
                </template>
              </v-list-item>
            </template>
          </v-autocomplete>
        </div>

        <div class="filter-section">
          <div class="text-caption font-weight-medium mb-1">Tenacity range</div>
          <div class="d-flex ga-2">
            <v-text-field
              v-model.number="tenacityMin"
              label="Min"
              type="number"
              min="0"
              density="compact"
              variant="outlined"
              hide-details
              clearable
            />
            <v-text-field
              v-model.number="tenacityMax"
              label="Max"
              type="number"
              min="0"
              density="compact"
              variant="outlined"
              hide-details
              clearable
            />
          </div>
        </div>
      </div>
      </div>
    </v-scroll-y-transition>

    <div v-if="selectedFilterTags.length" class="active-filter-chips mb-2">
      <v-chip
        v-for="tag in selectedFilterTags"
        :key="tag"
        size="small"
        closable
        @click:close="removeSelectedFilterTag(tag)"
      >
        {{ tag }}
      </v-chip>
    </div>

    <!-- SEARCH ROW: full width -->
    <div style="flex: 0 0 auto;">
    <v-text-field
      style="flex: 0 0 auto;"
      v-model="search"
      density="compact"
      variant="outlined"
      placeholder="Search name, CAS, synonym, or INCI..."
      hide-details
      clearable
      class="mb-3"
    />

    </div>
    <!-- TABLE SCROLLER -->
    <div class="ingredients-table-scroll" style="flex: 1 1 auto; min-height: 0; overflow-y: auto;">
      <table class="ingredients-table w-100 text-body-2">
        <thead class="bg-bgHeader">
          <tr>
            <th class="cas-col text-left py-2">CAS</th>
            <th class="name-col text-left py-2">Name</th>
            <th class="conc-col text-right py-2">Conc</th>
            <th class="solvent-col text-left py-2">Solvent</th>
            <th class="price-col text-right py-2">$/g</th>
            <th class="actions-col text-right py-2"><span class="actions-header-label">Actions</span></th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="item in filteredItems"
            :key="ingredientRowKey(item)"
            class="hover:bg-grey-lighten-4"
          >
            <td class="cas-col py-1">{{ casDisplay(item.cas) }}</td>

            <td class="name-col py-1">
              <div class="d-flex align-center flex-wrap ga-1">
                <span class="font-weight-medium">{{ capitaliseFirstLetter(item.name) }}</span>

                <v-chip
                  v-if="item.isAllergen"
                  color="allergen"
                  size="x-small"
                  variant="flat"
                >
                  Allergen
                </v-chip>

                <v-chip
                  v-if="!item.isAllergen && (item.allergenList?.length || 0) > 0"
                  color="allergen"
                  size="x-small"
                  variant="outlined"
                >
                  Contains allergens
                </v-chip>

                <v-chip
                  v-if="item.r"
                  color="purple"
                  size="x-small"
                  clickable
                  class="cursor-pointer"
                  @click.stop="emitShowIfra(item, 'r')"
                >
                  IFRA R
                </v-chip>

                <v-chip
                  v-if="item.s"
                  color="blue"
                  size="x-small"
                  clickable
                  class="cursor-pointer"
                  @click.stop="emitShowIfra(item, 's')"
                >
                  IFRA S
                </v-chip>

                <v-chip
                  v-if="item.p"
                  color="black"
                  size="x-small"
                  clickable
                  class="cursor-pointer"
                  @click.stop="emitShowIfra(item, 'p')"
                >
                  IFRA P
                </v-chip>
              </div>

              <div class="mobile-row-detail text-caption text-grey-darken-1 mt-1">
                CAS: {{ casDisplay(item.cas) }}
              </div>
              <div class="mobile-row-detail text-caption text-grey-darken-1">
                {{ item.concentration ?? 100 }}% <span v-if="item.solvent">{{ item.solvent }}</span><span v-else>-</span>
              </div>
              <div class="mobile-row-detail text-caption text-grey">
                $/g:
                <span v-if="item.price && item.quantity">{{ (item.price / item.quantity).toFixed(4) }}</span>
                <span v-else>-</span>
              </div>
            </td>

            <td class="conc-col py-1 text-right">{{ item.concentration ?? 100 }}%</td>
            <td class="solvent-col py-1">{{ item.solvent || "-" }}</td>

            <td class="price-col py-1 text-right">
              <span v-if="item.price && item.quantity">
                {{ (item.price / item.quantity).toFixed(4) }}
              </span>
              <span v-else>-</span>
            </td>

            <td class="actions-col py-1 text-right">
              <div class="desktop-actions">
                <v-btn size="x-small" color="btnAdd" @click.stop="emit('add', item)" variant="flat">
                  Add
                </v-btn>

              <v-btn
                size="x-small"
                color="btnEdit"
                variant="outlined"
                                class="ml-1"
                @click.stop="openEditDialog(item)"
              >
                EDIT
              </v-btn>

                <v-btn
                  icon="mdi-information-outline"
                  size="x-small"
                  variant="text"
                  @click.stop="openInfoDialog(item)"
                />
              </div>

              <v-btn
                class="mobile-actions-trigger"
                icon="mdi-dots-vertical"
                size="x-small"
                variant="tonal"
                @click.stop="openActionMenu(item)"
              />
            </td>
          </tr>

          <tr v-if="filteredItems.length === 0">
            <td colspan="6" class="py-3 text-center text-grey-darken-1">
              No ingredients match your search.
            </td>
          </tr>
        </tbody>
      </table>
    </div>



    <JsonUploadDialog
      v-model="loadDialog"
      :parse-records="parseIngredientImport"
      item-label="ingredient(s)"
      @confirm="confirmIngredientImport"
    />

    <!-- MOBILE ROW ACTIONS DIALOG -->
    <v-dialog v-model="actionMenuDialog" max-width="360">
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between text-h6">
          <span>{{ actionMenuItem?.name || "Ingredient Actions" }}</span>
          <v-btn icon="mdi-close" variant="text" size="small" @click="closeActionMenu" />
        </v-card-title>

        <v-card-text>
          <div class="d-flex flex-column ga-2">
            <v-btn
              color="btnAdd"
              variant="flat"
              block
              @click="addActionMenuItem"
            >
              Add
            </v-btn>

            <v-btn
              color="btnEdit"
              variant="outlined"
              block
              @click="editActionMenuItem"
            >
              Edit
            </v-btn>

            <v-btn
              variant="tonal"
              block
              @click="infoActionMenuItem"
            >
              More Info
            </v-btn>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <IngredientInfoDialog
      :model-value="infoDialog"
      :ingredient="infoItem"
      @update:model-value="setInfoDialogOpen"
    >
      <template #actions>
        <v-btn color="btnDelete" variant="flat" @click="deleteConfirmDialog = true">Delete</v-btn>
      </template>
    </IngredientInfoDialog>

    <!-- DELETE INGREDIENT CONFIRMATION DIALOG -->
    <v-dialog v-model="deleteConfirmDialog" max-width="520">
      <v-card>
        <v-card-title class="text-h6">Delete Material</v-card-title>
        <v-card-text>Are you sure you want to delete this material?</v-card-text>
        <v-card-actions class="modal-actions-split">
          <v-btn variant="text" @click="deleteConfirmDialog = false">Cancel</v-btn>
          <v-spacer />
          <v-btn color="error" variant="flat" @click="confirmDeleteInfoIngredient">Confirm</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ADD INGREDIENT DIALOG -->
    <v-dialog v-model="addDialog" max-width="900" scrollable :persistent="isSavingIngredient">
      <v-card class="ingredient-editor-dialog" :aria-busy="isSavingIngredient">
        <v-card-title class="d-flex align-center justify-space-between text-h6">
          <span>{{ isEditing ? `Edit Ingredient [${editOriginalName}]` : "Add Ingredient" }}</span>
          <v-btn icon="mdi-close" variant="text" size="small" :disabled="isSavingIngredient" @click="closeDialog" />
        </v-card-title>

        <v-card-text :inert="isSavingIngredient">
          <div class="ingredient-form d-flex flex-column ga-4">
            <!-- GENERAL -->
            <section class="form-section">
              <div class="section-title">General</div>

              <div class="form-row">
                <v-text-field
                  v-model="newCas"
                  class="field-1-3"
                  label="CAS (alphanumeric + dashes)"
                  placeholder="e.g. 81-14-1"
                  variant="outlined"
                  density="comfortable"
                  :error="!!casError"
                  :error-messages="casError"
                  @update:modelValue="newCas = sanitizeCas(newCas)"
                />

                <v-text-field
                  v-model="newName"
                  class="field-2-3"
                  label="Name"
                  placeholder="e.g. Musk ketone"
                  variant="outlined"
                  density="comfortable"
                  :error="!!nameError"
                  :error-messages="nameError"
                />
              </div>

              <div class="form-row">
                <v-text-field
                  v-model.number="newConcentration"
                  class="field-1-3"
                  label="Concentration (%)"
                  type="number"
                  min="0"
                  max="100"
                  variant="outlined"
                  density="comfortable"
                  :error="!!concError"
                  :error-messages="concError"
                />

                <v-text-field
                  v-model="solvent"
                  class="field-2-3"
                  label="Solvent"
                  placeholder="e.g. BB, DPG, ETOH"
                  variant="outlined"
                  density="comfortable"
                  clearable
                />
              </div>

              <div class="form-row">
                <v-text-field
                  v-model.number="price"
                  class="field-50"
                  label="Price ( > 0 )"
                  type="number"
                  min="0"
                  variant="outlined"
                  density="comfortable"
                  :error="!!priceError"
                  :error-messages="priceError"
                />

                <v-text-field
                  v-model.number="quantity"
                  class="field-50"
                  label="Quantity (g, > 0)"
                  type="number"
                  min="0"
                  variant="outlined"
                  density="comfortable"
                  :error="!!quantityError"
                  :error-messages="quantityError"
                />
              </div>

              <div class="form-row">
                <v-text-field
                  v-model="supplier"
                  class="field-50"
                  label="Supplier"
                  variant="outlined"
                  density="comfortable"
                />

                <v-text-field
                  v-model="manufacturer"
                  class="field-50"
                  label="Manufacturer"
                  variant="outlined"
                  density="comfortable"
                />
              </div>
            </section>

            <v-divider class="light-separator" />

            <!-- ADDITIONAL -->
            <section class="form-section">
              <div class="section-title">Additional</div>

              <div class="form-row">
                <v-text-field
                  v-model="inciName"
                  class="field-30"
                  label="INCI Name"
                  variant="outlined"
                  density="comfortable"
                  clearable
                />

                <v-combobox
                  v-model="synonyms"
                  v-model:search="synonymsSearch"
                  class="field-70"
                  :delimiters="[';']"
                  label="Synonyms"
                  multiple
                  chips
                  closable-chips
                  clearable
                  variant="outlined"
                  density="comfortable"
                  hint="Press Enter or Semicolon (;) to add"
                  persistent-hint
                  @keydown="onSynonymsSemicolonKeydown"
                  @update:search="onSynonymsSearch"
                />
              </div>

              <div class="form-row">
                <v-text-field
                  v-model.number="tenacity"
                  class="field-50"
                  label="Tenacity (hours)"
                  type="number"
                  min="0"
                  variant="outlined"
                  density="comfortable"
                />

                <v-select
                  v-model="strength"
                  class="field-50"
                  :items="strengthOptions"
                  label="Strength"
                  variant="outlined"
                  density="comfortable"
                  clearable
                />
              </div>

              <div class="form-row">
                <v-combobox
                  v-model="tags"
                  v-model:search="tagsSearch"
                  class="field-full"
                  :delimiters="[';']"
                  label="Tags"
                  multiple
                  chips
                  closable-chips
                  clearable
                  variant="outlined"
                  density="comfortable"
                  hint="Press Enter or Semicolon (;) to add"
                  persistent-hint
                  @keydown="onTagsSemicolonKeydown"
                  @update:search="onTagsSearch"
                />
              </div>

              <div class="form-row">
                <v-combobox
                  v-model="scentFamily"
                  v-model:search="scentFamilySearch"
                  class="field-50"
                  :delimiters="[';']"
                  label="Scent Family"
                  multiple
                  chips
                  closable-chips
                  clearable
                  variant="outlined"
                  density="comfortable"
                  hint="Press Enter or Semicolon (;) to add"
                  persistent-hint
                  @keydown="onScentFamilySemicolonKeydown"
                  @update:search="onScentFamilySearch"
                />

                <v-combobox
                  v-model="chemicalFamily"
                  v-model:search="chemicalFamilySearch"
                  class="field-50"
                  :delimiters="[';']"
                  label="Chemical Family"
                  multiple
                  chips
                  closable-chips
                  clearable
                  variant="outlined"
                  density="comfortable"
                  hint="Press Enter or Semicolon (;) to add"
                  persistent-hint
                  @keydown="onChemicalFamilySemicolonKeydown"
                  @update:search="onChemicalFamilySearch"
                />
              </div>

              <div class="form-row">
                <v-combobox
                  v-model="types"
                  v-model:search="typesSearch"
                  class="field-full"
                  :items="defaultTypeOptions"
                  :delimiters="[';']"
                  label="Type"
                  multiple
                  chips
                  closable-chips
                  clearable
                  variant="outlined"
                  density="comfortable"
                  hint="Select existing or type a new value then press Enter or Semicolon (;)"
                  persistent-hint
                  @keydown="onTypesSemicolonKeydown"
                  @update:search="onTypesSearch"
                />
              </div>

              <div class="form-row">
                <v-textarea
                  v-model="description"
                  class="field-full"
                  label="Description"
                  variant="outlined"
                  density="comfortable"
                  rows="3"
                  auto-grow
                />
              </div>
            </section>

            <v-divider class="light-separator" />

            <!-- ALLERGENS -->
            <section class="form-section">
              <div class="section-title">Allergens</div>

              <div class="form-row">
                <v-switch
                  v-model="isAllergen"
                  class="field-full"
                  label="Is Allergen"
                  inset
                  color="red"
                  hide-details
                />
              </div>

              <!-- ALLERGEN LIST (composition of this ingredient) -->
              <div class="regulatory-block">
                <p class="text-caption text-medium-emphasis mb-0">
                  When you add an item is both an Allergen and IFRA ingredient, it will automatically add to the other list too.
                </p>
                <div class="text-subtitle-2">Allergen List</div>

                <div class="form-row align-center">
                  <v-autocomplete
                    v-model="allergenPicked"
                    class="pick-field"
                    :items="allergenOptions"
                    :custom-filter="trimmedOptionFilter"
                    item-title="label"
                    item-value="value"
                    label="Search Allergen"
                    variant="outlined"
                    density="comfortable"
                    clearable
                    hide-details
                  />

                  <v-text-field
                    v-model.number="allergenPickedPct"
                    class="pct-field"
                    label="Concentration (%)"
                    type="number"
                    min="0"
                    max="100"
                    variant="outlined"
                    density="comfortable"
                    hide-details
                  />

                  <v-btn
                    color="btnAdd"
                    variant="flat"
                    class="composition-add-btn"
                    :disabled="!allergenPicked || !isPct(allergenPickedPct)"
                    @click="addAllergenListItem"
                  >
                    Add
                  </v-btn>
                </div>

                <v-sheet
                  v-if="allergenList.length"
                  color="bgAccent"
                  rounded="lg"
                  class="selected-composition-section pa-2"
                >
                  <div class="d-flex flex-column ga-2">
                    <div
                      v-for="(x, idx) in allergenList"
                      :key="primaryCas(x.cas) + '::' + idx"
                      class="selected-composition-row d-flex align-center justify-space-between"
                    >
                      <div class="d-flex flex-column">
                        <div class="font-weight-medium">{{ x.name }}</div>
                        <div class="text-caption text-grey">
                          CAS: {{ casDisplay(x.cas) }} • %: {{ x.concentration }}
                        </div>
                      </div>
                      <v-btn icon="mdi-close" variant="text" size="small" @click="allergenList.splice(idx, 1)" />
                    </div>
                  </div>
                </v-sheet>

              </div>

              <div class="form-row">
                <v-text-field
                  v-model.number="ifraMaxLimit"
                  class="field-compact"
                  label="IFRA Max Limit ( > 0 )"
                  type="number"
                  min="0"
                  variant="outlined"
                  density="comfortable"
                  :error="!!ifraMaxLimitError"
                  :error-messages="ifraMaxLimitError"
                />
              </div>

              <!-- IFRA LIST (composition of this ingredient) -->
              <div class="regulatory-block">
                <div class="text-subtitle-2">IFRA List</div>

                <div class="form-row align-center">
                  <v-autocomplete
                    v-model="ifraPicked"
                    class="pick-field"
                    :items="ifraOptions"
                    :custom-filter="trimmedOptionFilter"
                    item-title="label"
                    item-value="value"
                    label="Search IFRA ingredient"
                    variant="outlined"
                    density="comfortable"
                    clearable
                    hide-details
                  />

                  <v-text-field
                    v-model.number="ifraPickedPct"
                    class="pct-field"
                    label="Concentration (%)"
                    type="number"
                    min="0"
                    max="100"
                    variant="outlined"
                    density="comfortable"
                    hide-details
                  />

                  <v-btn
                    color="btnAdd"
                    variant="flat"
                    class="composition-add-btn"
                    :disabled="!ifraPicked || !isPct(ifraPickedPct)"
                    @click="addIfraListItem"
                  >
                    Add
                  </v-btn>
                </div>

                <v-sheet
                  v-if="ifraList.length"
                  color="bgAccent"
                  rounded="lg"
                  class="selected-composition-section pa-2"
                >
                  <div class="d-flex flex-column ga-2">
                    <div
                      v-for="(x, idx) in ifraList"
                      :key="primaryCas(x.cas) + '::' + idx"
                      class="selected-composition-row d-flex align-center justify-space-between"
                    >
                      <div class="d-flex flex-column">
                        <div class="font-weight-medium">{{ x.name }}</div>
                        <div class="text-caption text-grey">
                          CAS: {{ casDisplay(x.cas) }} • %: {{ x.concentration }}
                        </div>
                      </div>
                      <v-btn icon="mdi-close" variant="text" size="small" @click="ifraList.splice(idx, 1)" />
                    </div>
                  </div>
                </v-sheet>

              </div>

            </section>

            <v-divider class="light-separator" />

            <!-- REGULATORY (SAFETY DATA) -->
            <section class="form-section">
              <div class="section-title">Regulatory</div>

              <div class="form-row">
                <v-text-field
                  v-model="ec"
                  class="field-50"
                  label="EC No."
                  placeholder="e.g. 201-134-4"
                  variant="outlined"
                  density="comfortable"
                  @update:modelValue="ec = sanitizeCas(ec)"
                />
                <v-text-field
                  v-model="euReach"
                  class="field-50"
                  label="EU REACH No."
                  placeholder="e.g. 01-2119457610-43"
                  variant="outlined"
                  density="comfortable"
                  @update:modelValue="euReach = sanitizeCas(euReach)"
                />
              </div>

              <div class="form-row align-center">
                <v-autocomplete
                  v-model="ghsPicked"
                  v-model:search="ghsPickedSearch"
                  class="pick-field"
                  :items="ghsOptions"
                  item-title="title"
                  item-value="value"
                  label="GHS Classification"
                  variant="outlined"
                  density="comfortable"
                  clearable
                  hint="Selecting a H-code will automatically add it to the list if there is no sub-category."
                  persistent-hint
                />
                <v-select
                  v-model="ghsCategoryPicked"
                  class="pct-field"
                  :items="selectedGhsCategoryOptions"
                  label="GHS Category"
                  variant="outlined"
                  density="comfortable"
                  clearable
                  :disabled="!ghsPicked || selectedGhsCategoryOptions.length <= 1"
                  hint="Selecting a category will automatically add the classification."
                  persistent-hint
                />
              </div>

              <div v-if="ghsClassificationRows.length" class="d-flex flex-column ga-2">
                <div v-for="row in ghsClassificationRows" :key="row.code" class="d-flex align-center justify-space-between ga-2">
                  <div>
                    <div class="font-weight-medium">
                      {{ row.code }}<span v-if="row.category != null && row.category !== ''"> - Category {{ row.category }}</span>
                    </div>
                    <div class="text-caption text-medium-emphasis">{{ row.statement || "Statement unavailable" }}</div>
                  </div>
                  <v-btn
                    icon="mdi-close"
                    variant="text"
                    size="small"
                    :aria-label="'Remove ' + row.code"
                    @click="removeGhsClassificationItem(row.code)"
                  />
                </div>
              </div>

              <div class="form-row">
                <v-text-field
                  v-model="sdsLink"
                  class="field-full"
                  label="SDS Reference Link"
                  placeholder="Paste SDS URL/reference as plain text"
                  variant="outlined"
                  density="comfortable"
                  clearable
                />
              </div>

              <div class="form-row">
                <v-select
                  v-model="aicisCategory"
                  class="field-compact"
                  :items="aicisOptions"
                  label="AICIS Category"
                  variant="outlined"
                  density="comfortable"
                />
              </div>
            </section>
          </div>
        </v-card-text>

        <v-card-actions class="modal-actions-split flex-wrap">
          <v-alert v-if="ingredientSaveError" type="error" variant="tonal" density="compact" class="save-error-alert" role="alert">
            {{ ingredientSaveError }}
          </v-alert>
          <v-btn variant="text" :disabled="isSavingIngredient" @click="closeDialog">Cancel</v-btn>
          <v-spacer />
          <v-btn color="btnConfirm" variant="flat" :loading="isSavingIngredient" :disabled="isSavingIngredient || !canSubmit" @click="confirmSave">
            {{ isEditing ? "Save" : "Confirm" }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup>


function pickCasFromValue(v) {
  return String(v || "").split("::")[0].trim()
}

function casArray(v) {
  if (Array.isArray(v)) {
    return v.map(x => String(x || "").trim()).filter(Boolean)
  }
  const s = String(v || "").trim()
  return s ? [s] : []
}

function primaryCas(v) {
  return casArray(v)[0] || ""
}

function casDisplay(v) {
  const arr = casArray(v)
  return arr.length ? arr.join(", ") : "-"
}

function capitaliseFirstLetter(v) {
  const s = String(v || "").trim()
  if (!s) return ""
  return s.charAt(0).toUpperCase() + s.slice(1)
}
import { ref, computed, nextTick, watch, onMounted, onBeforeUnmount } from "vue"
import JsonUploadDialog from "@/components/JsonUploadDialog.vue"
import IngredientInfoDialog from "@/components/IngredientInfoDialog.vue"
import rawIfra51 from "@/assets/data/ifra51.json"
import rawAllergens from "@/assets/data/allergens.json"
import rawTags from "@/assets/data/tags.json"
import rawGhs from "@/assets/data/ghs.json"
import { categoriesForGhsCode, ghsEntryForCode, normaliseGhsCategories, normaliseGhsCodes } from "@/utils/ghsHelpers.js"

const props = defineProps({
  items: { type: Array, required: true }
})

const emit = defineEmits(["add", "show-info", "show-ifra", "create-ingredient", "update-ingredient", "delete-ingredient", "load-ingredients"])

/* ---------------- import ingredients ---------------- */
const loadDialog = ref(false)

function openLoadDialog() {
  loadDialog.value = true
}

function parseIngredientImport(json) {
  const items = Array.isArray(json) ? json : json?.items
  if (!Array.isArray(items) || items.some(item =>
    !item || typeof item !== "object" || Array.isArray(item) || isAccordRecord(item) ||
    !(typeof item.name === "string" && item.name.trim() ||
      Array.isArray(item.names) && typeof item.names[0] === "string" && item.names[0].trim())
  )) {
    throw new Error("Invalid ingredients file. Expected an array of ingredient records, or an object with an items array.")
  }

  // Match the parent's normalization before deduping legacy records.
  return items.map(item => {
    const cas = primaryCas(item.cas)
    const name = Array.isArray(item.names) ? String(item.names[0] || "Unknown") : String(item.name || "Unknown")
    return {
      ...item,
      key: String(item.key || item.id || `${cas}::${name}`),
      cas,
      name,
      concentration: item.concentration ?? 100
    }
  })
}

function confirmIngredientImport(incoming) {
  const merged = dedupeIngredientsForTable([...(props.items || []), ...incoming])
  emit("load-ingredients", merged)

  const deletedKeys = new Set(deletedIngredientKeys.value)
  for (const item of incoming) {
    for (const key of ingredientIdentityValues(item)) deletedKeys.delete(key)
  }
  deletedIngredientKeys.value = deletedKeys
}

const showFilters = ref(false)
// Accords are NOT filtered unless the user explicitly enables this checkbox.
const filterAccordsTable = ref(false)
const selectedFilterTags = ref([])
const tenacityMin = ref(null)
const tenacityMax = ref(null)
const searchInclude = ref({
  tags: false,
  description: false,
  scentFamily: false,
  chemicalFamily: false
})

const search = ref("")
const deletedIngredientKeys = ref(new Set())

const actionMenuDialog = ref(false)
const actionMenuItem = ref(null)

function openActionMenu(item) {
  actionMenuItem.value = item || null
  actionMenuDialog.value = true
}

function closeActionMenu() {
  actionMenuDialog.value = false
  actionMenuItem.value = null
}

function addActionMenuItem() {
  if (!actionMenuItem.value) return
  emit("add", actionMenuItem.value)
  closeActionMenu()
}

function editActionMenuItem() {
  if (!actionMenuItem.value) return
  const item = actionMenuItem.value
  closeActionMenu()
  openEditDialog(item)
}

function infoActionMenuItem() {
  if (!actionMenuItem.value) return
  const item = actionMenuItem.value
  closeActionMenu()
  openInfoDialog(item)
}

function isAccordRecord(item) {
  return String(item?.type || "").toUpperCase() === "ACCORD" ||
    String(item?.kind || "").toLowerCase() === "accord" ||
    String(item?.cas || "").toUpperCase() === "ACCORD"
}

// CAS identifies a chemical, not a record. Two suppliers/grades can share a CAS.
// Prefer the actual unique record ID everywhere that requires record identity.
function ingredientIdentityValues(item) {
  const id = String(item?.id ?? "").trim()
  if (id) return [id]

  const key = String(item?.key ?? "").trim()
  const name = String(item?.name ?? "").trim()
  const casList = casArray(item?.cas)

  // Legacy records without an id: prefer a dedicated key, then the name.
  // Never use CAS when a more specific identity is available.
  if (key && !casList.some(c => c.toLowerCase() === key.toLowerCase())) return [key]
  if (name) return [name]
  if (key) return [key]
  return casList
}

function normaliseIngredientIdentity(v) {
  return String(v ?? "").trim().toLowerCase()
}

function ingredientDedupeKeys(item) {
  const id = normaliseIngredientIdentity(item?.id)
  if (id) return [`id:${id}`]

  // Only for legacy records with no ID: use a composite of record-specific
  // fields rather than collapsing all materials that share a CAS number.
  const legacyRecord = [
    item?.key,
    item?.name,
    casArray(item?.cas).map(normaliseIngredientIdentity),
    item?.supplier,
    item?.manufacturer,
    item?.concentration,
    item?.solvent,
    item?.quantity,
    item?.price,
    item?.type
  ]
  return [`legacy:${JSON.stringify(legacyRecord).toLowerCase()}`]
}

function ingredientRowKey(item) {
  // ID-based keys avoid Vue reusing a row from another ingredient with the
  // same CAS when filtering or clearing search text.
  return ingredientDedupeKeys(item)[0]
}

function dedupeIngredientsForTable(items) {
  const seen = new Set()
  const out = []

  for (const item of Array.isArray(items) ? items : []) {
    if (!item || typeof item !== "object") continue

    const recordKey = ingredientDedupeKeys(item)[0]
    if (seen.has(recordKey)) continue

    seen.add(recordKey)
    out.push(item)
  }

  return out
}

function isLocallyDeletedIngredient(item) {
  return ingredientIdentityValues(item).some(k => deletedIngredientKeys.value.has(k))
}

function markIngredientDeleted(item) {
  const next = new Set(deletedIngredientKeys.value)
  for (const key of ingredientIdentityValues(item)) next.add(key)
  deletedIngredientKeys.value = next
}


function stringList(v) {
  if (Array.isArray(v)) return v.map(x => String(x || "").trim()).filter(Boolean)
  const s = String(v || "").trim()
  return s ? [s] : []
}

function searchableTextFrom(item, fields) {
  return fields
    .flatMap(field => {
      if (field === "cas") return stringList(casDisplay(item?.cas))
      return stringList(item?.[field])
    })
    .join(" ")
    .toLowerCase()
}

function tagMatches(item, selectedTags) {
  const selected = (Array.isArray(selectedTags) ? selectedTags : [])
    .map(x => String(x || "").trim().toLowerCase())
    .filter(Boolean)

  if (!selected.length) return true

  const itemTags = stringList(item?.tags).map(x => x.toLowerCase())
  return selected.every(tag => itemTags.includes(tag))
}

function tenacityInRange(item) {
  const minRaw = tenacityMin.value
  const maxRaw = tenacityMax.value
  const hasMin = minRaw !== null && minRaw !== "" && Number.isFinite(Number(minRaw))
  const hasMax = maxRaw !== null && maxRaw !== "" && Number.isFinite(Number(maxRaw))

  if (!hasMin && !hasMax) return true

  const n = Number(item?.tenacity)
  if (!Number.isFinite(n)) return false

  const min = hasMin ? Number(minRaw) : -Infinity
  const max = hasMax ? Number(maxRaw) : Infinity

  return n >= Math.min(min, max) && n <= Math.max(min, max)
}

const tagFilterOptions = computed(() => {
  const source = Array.isArray(rawTags) ? rawTags : []
  const out = []
  const seen = new Set()

  function addTag(value) {
    const tag = String(value || "").trim()
    const key = tag.toLowerCase()
    if (!tag || seen.has(key)) return
    seen.add(key)
    out.push({ title: tag, value: tag })
  }

  for (const entry of source) {
    if (typeof entry === "string") {
      addTag(entry)
      continue
    }

    addTag(entry?.tag || entry?.name || entry?.label || entry?.value)
  }

  return out.sort((a, b) => a.title.localeCompare(b.title))
})

function removeSelectedFilterTag(tag) {
  const key = String(tag || "").trim().toLowerCase()
  selectedFilterTags.value = selectedFilterTags.value.filter(x => String(x || "").trim().toLowerCase() !== key)
}

const ingredientNameCollator = new Intl.Collator("en", { sensitivity: "base", numeric: true })

const filteredItems = computed(() => {
  const term = String(search.value || "").toLowerCase().trim()

  // Parent state can temporarily contain the same ingredient more than once
  // after localStorage/JSON merges or rapid search re-renders. Dedupe here so
  // the table always renders one stable row per real ingredient.
  const ingredientsOnly = dedupeIngredientsForTable(props.items)
    .filter((item) => !isAccordRecord(item) && !isLocallyDeletedIngredient(item))

  return ingredientsOnly.filter((item) => {
    if (!tagMatches(item, selectedFilterTags.value)) return false
    if (!tenacityInRange(item)) return false

    if (!term) return true

    const fields = ["name", "cas", "synonyms", "inci", "inciName"]

    if (searchInclude.value.tags) fields.push("tags")
    if (searchInclude.value.description) fields.push("description")
    if (searchInclude.value.scentFamily) fields.push("scentFamily")
    if (searchInclude.value.chemicalFamily) fields.push("chemicalFamily")

    return searchableTextFrom(item, fields).includes(term)
  }).sort((a, b) => ingredientNameCollator.compare(
    String(a?.name ?? "").trim(),
    String(b?.name ?? "").trim()
  ))
})

function broadcastAccordsSearchState() {
  if (typeof window === "undefined") return

  window.dispatchEvent(new CustomEvent("ingredient-organiser-search", {
    detail: {
      search: String(search.value || ""),
      filterAccords: filterAccordsTable.value === true
    }
  }))
}

// Broadcast on both search changes and checkbox changes. Turning the option
// off immediately clears the filter currently applied to the accords table.
watch([search, filterAccordsTable], broadcastAccordsSearchState)

// AccordsTable requests the current state when it mounts. This avoids losing
// the selected option if sibling components mount in different orders.
onMounted(() => {
  if (typeof window === "undefined") return
  window.addEventListener("ingredient-organiser-search-request", broadcastAccordsSearchState)
  broadcastAccordsSearchState()
})

onBeforeUnmount(() => {
  if (typeof window === "undefined") return
  window.removeEventListener("ingredient-organiser-search-request", broadcastAccordsSearchState)
})

function emitShowIfra(item, type) {
  emit("show-ifra", item, type)
}


/* ---------------- Ingredient Info Modal ---------------- */
const infoDialog = ref(false)
const infoItem = ref(null)
const deleteConfirmDialog = ref(false)

function openInfoDialog(item) {
  infoItem.value = item || null
  deleteConfirmDialog.value = false
  infoDialog.value = true
}

function setInfoDialogOpen(open) {
  infoDialog.value = open
  if (!open) deleteConfirmDialog.value = false
}

function closeInfoDialog() {
  setInfoDialogOpen(false)
}

async function confirmDeleteInfoIngredient() {
  const item = infoItem.value
  if (!item) return

  const identities = ingredientIdentityValues(item)
  const key = String(item?.id || item?.key || item?.name || primaryCas(item?.cas) || identities[0] || "").trim()

  if (!key && !identities.length) {
    alert("Could not delete this material because no ID, key, CAS, or name was found.")
    return
  }

  try {
    const res = await $fetch("/api/ingredients", {
      method: "DELETE",
      // Send only the unique ID when one is available. Sending CAS alongside
      // it can inadvertently delete *all* records with that CAS number.
      body: {
        key,
        keys: identities,
        ...(item?.id != null && String(item.id).trim() ? { id: item.id } : {})
      },
      query: { key }
    })

    if (res && res.ok === false) throw new Error(res?.message || "Delete failed")

    const deleted = Number(res?.deleted ?? 0)
    const staleOnly = Number.isFinite(deleted) && deleted < 1

    if (staleOnly) {
      console.warn("This material was not found in ingredients.json, so it is being removed as stale UI/cache state.", { key, identities })
    }
  } catch (err) {
    console.error("Could not delete ingredient from assets/data/ingredients.json.", err)
    alert("Could not delete this material from ingredients.json. Check that server/api/ingredients.delete.js exists, remove any old server/api/ingredients.js route, then restart Nuxt.")
    return
  }

  // Hide immediately after the server responds. If deleted === 0, this row was
  // already gone from ingredients.json and only existed in stale UI/cache state.
  markIngredientDeleted(item)
  // Keep the parent event record-specific as well; including the entire item
  // would let older parent handlers match its CAS and remove sibling records.
  emit("delete-ingredient", { key, keys: identities, id: item?.id })
  deleteConfirmDialog.value = false
  closeInfoDialog()
}


/* ---------------- Add Ingredient Modal State ---------------- */
const addDialog = ref(false)
const isSavingIngredient = ref(false)
const ingredientSaveError = ref("")
const isEditing = ref(false)
const editOriginalKey = ref(null)
const editOriginalName = ref("")

const newCas = ref("")
const newName = ref("")
const newConcentration = ref(100)
const inciName = ref("")
const ec = ref("")
const euReach = ref("")
const ghsClassification = ref([])
const ghsCategory = ref([])
const ghsPicked = ref(null)
const ghsPickedSearch = ref("")
const ghsCategoryPicked = ref(null)
const sdsLink = ref("")
const aicisCategory = ref("Uncategorised")
const aicisOptions = computed(() => [...new Set([
  "Listed", "Exempted", "Reported", "Uncategorised", aicisCategory.value
].filter(Boolean))])

const ghsOptions = computed(() => (Array.isArray(rawGhs) ? rawGhs : [])
  .filter(entry => String(entry?.code || "").startsWith("H"))
  .map(entry => ({ value: entry.code, title: `${entry.code} - ${entry.statement || ""}` })))
const selectedGhsCategoryOptions = computed(() => categoriesForGhsCode(ghsPicked.value).map(String))
const canAddGhsClassification = computed(() => {
  if (!ghsOptions.value.some(option => option.value === ghsPicked.value)) return false
  const options = selectedGhsCategoryOptions.value
  return !options.length || options.includes(String(ghsCategoryPicked.value ?? "").trim())
})
const ghsClassificationRows = computed(() => normaliseGhsCategories(ghsCategory.value, ghsClassification.value)
  .map(row => ({ ...row, statement: ghsEntryForCode(row.code)?.statement || "" })))

watch(ghsPicked, code => {
  const options = categoriesForGhsCode(code)
  ghsCategoryPicked.value = options.length === 1 ? String(options[0]) : null
  if (code && options.length <= 1) addGhsClassificationItem()
})

watch(ghsCategoryPicked, category => {
  if (category == null || !ghsPicked.value || categoriesForGhsCode(ghsPicked.value).length <= 1) return
  addGhsClassificationItem()
})

function addGhsClassificationItem() {
  if (!canAddGhsClassification.value) return
  const code = ghsPicked.value
  const categoryText = String(ghsCategoryPicked.value ?? "").trim()
  const category = categoriesForGhsCode(code).find(value => String(value) === categoryText) ?? (categoryText || null)
  ghsClassification.value = normaliseGhsCodes([...ghsClassification.value, code])
  ghsCategory.value = normaliseGhsCategories(ghsCategory.value, ghsClassification.value)
    .map(row => row.code === code ? { code, category } : row)
  ghsPicked.value = null
  ghsCategoryPicked.value = null
  ghsPickedSearch.value = ""
  // Vuetify can update its search after the selection event finishes.
  nextTick(() => {
    if (!ghsPicked.value) ghsPickedSearch.value = ""
  })
}

function removeGhsClassificationItem(code) {
  ghsClassification.value = ghsClassification.value.filter(value => value !== code)
  ghsCategory.value = ghsCategory.value.filter(row => row.code !== code)
}

function resetSafetyFields(item = {}) {
  ec.value = item.ec || ""
  euReach.value = Object.prototype.hasOwnProperty.call(item, "euReach") ? item.euReach || "" : item.reach || ""
  ghsClassification.value = normaliseGhsCodes(item.ghsClassification)
  ghsCategory.value = normaliseGhsCategories(item.ghsCategory, item.ghsClassification)
  ghsPicked.value = null
  ghsCategoryPicked.value = null
  ghsPickedSearch.value = ""
  sdsLink.value = item.sdsLink || ""
  aicisCategory.value = item.aicisCategory || "Uncategorised"
}

// optional fields
const synonyms = ref([])
const synonymsSearch = ref("")
const tenacity = ref(null)
const solvent = ref("")
const description = ref("")
const tags = ref([])
const tagsSearch = ref("")
const strengthOptions = ["Very Weak", "Weak", "Medium", "High", "Very High"]
const strength = ref(null)
const isAllergen = ref(false)
const ifraMaxLimit = ref(null)
const supplier = ref("")
const manufacturer = ref("")
const quantity = ref(null)
const price = ref(null)
const scentFamily = ref([])
const scentFamilySearch = ref("")
const chemicalFamily = ref([])
const chemicalFamilySearch = ref("")
const defaultTypeOptions = ["Aromachemical", "Natural", "Accord", "Mixture"]
const types = ref([])
const typesSearch = ref("")

// ifraList & allergenList store concentration %
const ifraList = ref([])
const ifraPicked = ref(null)
const ifraPickedPct = ref(null)

const allergenList = ref([])
const allergenPicked = ref(null)
const allergenPickedPct = ref(null)

function openAddDialog() {
  if (isSavingIngredient.value) return
  resetSafetyFields()
  ingredientSaveError.value = ""
  isEditing.value = false
  editOriginalKey.value = null
  editOriginalName.value = ""
  newCas.value = ""
  newName.value = ""
  newConcentration.value = 100
  inciName.value = ""

  synonyms.value = []
  synonymsSearch.value = ""
  tenacity.value = null
  solvent.value = ""
  description.value = ""
  tags.value = []
  tagsSearch.value = ""
  strength.value = null
  isAllergen.value = false
  ifraMaxLimit.value = null
  supplier.value = ""
  manufacturer.value = ""
  quantity.value = null
  price.value = null
  scentFamily.value = []
  scentFamilySearch.value = ""
  chemicalFamily.value = []
  chemicalFamilySearch.value = ""
  types.value = []
  typesSearch.value = ""

  ifraList.value = []
  ifraPicked.value = null
  ifraPickedPct.value = null

  allergenList.value = []
  allergenPicked.value = null
  allergenPickedPct.value = null

  addDialog.value = true
}

function openEditDialog(item) {
  if (isSavingIngredient.value) return
  resetSafetyFields(item)
  ingredientSaveError.value = ""
  // Identify the exact record by its unique ID, not by a shared CAS/key.
  isEditing.value = true
  editOriginalKey.value = item?.id || item?.key || item?.cas || null
  editOriginalName.value = String(item?.name || "Ingredient").trim()

  newCas.value = item?.cas || ""
  newName.value = item?.name || ""
  newConcentration.value = item?.concentration ?? 100
  inciName.value = item?.inci || item?.inciName || ""

  synonyms.value = Array.isArray(item?.synonyms) ? [...item.synonyms] : []
  synonymsSearch.value = ""
  tenacity.value = item?.tenacity ?? null
  solvent.value = item?.solvent || ""
  description.value = item?.description || ""
  tags.value = Array.isArray(item?.tags) ? [...item.tags] : []
  tagsSearch.value = ""
  strength.value = item?.strength ?? null
  isAllergen.value = !!item?.isAllergen
  ifraMaxLimit.value = item?.ifraMaxLimit ?? null

  supplier.value = item?.supplier || ""
  manufacturer.value = item?.manufacturer || ""
  quantity.value = item?.quantity ?? null
  price.value = item?.price ?? null
  scentFamily.value = Array.isArray(item?.scentFamily) ? [...item.scentFamily] : []
  scentFamilySearch.value = ""
  chemicalFamily.value = Array.isArray(item?.chemicalFamily) ? [...item.chemicalFamily] : []
  chemicalFamilySearch.value = ""
  types.value = Array.isArray(item?.type)
    ? [...item.type]
    : Array.isArray(item?.types)
      ? [...item.types]
      : item?.type
        ? [item.type]
        : []
  typesSearch.value = ""

  ifraList.value = Array.isArray(item?.ifraList) ? item.ifraList.map(x => ({ ...x })) : []
  ifraPicked.value = null
  ifraPickedPct.value = null

  allergenList.value = Array.isArray(item?.allergenList) ? item.allergenList.map(x => ({ ...x })) : []
  allergenPicked.value = null
  allergenPickedPct.value = null

  addDialog.value = true
}

function closeDialog() {
  if (isSavingIngredient.value) return
  ingredientSaveError.value = ""
  addDialog.value = false
}


function sanitizeCas(v) {
  return String(v || "").toUpperCase().replace(/[^A-Z0-9-]/g, "")
}

function isPositiveNumber(v) {
  const n = Number(v)
  return Number.isFinite(n) && n > 0
}

function isPct(v) {
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 && n <= 100
}

function nonEmptyArray(arr) {
  const cleaned = (Array.isArray(arr) ? arr : [])
    .map((x) => String(x || "").trim())
    .filter(Boolean)
  return cleaned.length ? cleaned : []
}

function splitSemicolonTokens(value) {
  return String(value || "")
    .split(";")
    .map(x => x.trim())
    .filter(Boolean)
}

function addUniqueTokens(targetRef, tokens) {
  const current = Array.isArray(targetRef.value) ? [...targetRef.value] : []
  for (const token of tokens || []) {
    if (!current.some(x => String(x || "").trim().toLowerCase() === String(token).trim().toLowerCase())) {
      current.push(token)
    }
  }
  targetRef.value = current
}

const semicolonSearchSuppress = new WeakSet()

function forceClearComboboxSearch(searchRef, event = null) {
  semicolonSearchSuppress.add(searchRef)
  searchRef.value = ""

  const target = event?.target
  if (target && "value" in target) target.value = ""

  setTimeout(() => {
    searchRef.value = ""
    if (target && "value" in target) target.value = ""
  }, 0)

  setTimeout(() => {
    searchRef.value = ""
    if (target && "value" in target) target.value = ""
    semicolonSearchSuppress.delete(searchRef)
  }, 80)
}

function commitSemicolonArrayInput(listRef, searchRef, value, event = null) {
  const raw = String(value || "")
  const token = raw.replace(/;+/g, "").trim()

  if (!token) {
    forceClearComboboxSearch(searchRef, event)
    return false
  }

  addUniqueTokens(listRef, [token])
  forceClearComboboxSearch(searchRef, event)
  return true
}

function onSemicolonArrayKeydown(event, listRef, searchRef) {
  if (event?.key !== ";") return
  event.preventDefault()
  event.stopPropagation()
  commitSemicolonArrayInput(listRef, searchRef, searchRef.value || event?.target?.value || "", event)
}

function onSemicolonArraySearch(listRef, searchRef, value) {
  if (semicolonSearchSuppress.has(searchRef)) {
    searchRef.value = ""
    setTimeout(() => { searchRef.value = "" }, 0)
    return
  }

  const raw = String(value || "")
  if (!raw.includes(";")) {
    searchRef.value = raw
    return
  }

  commitSemicolonArrayInput(listRef, searchRef, raw)
}

function onSynonymsSemicolonKeydown(event) {
  onSemicolonArrayKeydown(event, synonyms, synonymsSearch)
}

function onSynonymsSearch(value) {
  onSemicolonArraySearch(synonyms, synonymsSearch, value)
}

function onTagsSemicolonKeydown(event) {
  onSemicolonArrayKeydown(event, tags, tagsSearch)
}

function onTagsSearch(value) {
  onSemicolonArraySearch(tags, tagsSearch, value)
}

function onScentFamilySemicolonKeydown(event) {
  onSemicolonArrayKeydown(event, scentFamily, scentFamilySearch)
}

function onScentFamilySearch(value) {
  onSemicolonArraySearch(scentFamily, scentFamilySearch, value)
}

function onChemicalFamilySemicolonKeydown(event) {
  onSemicolonArrayKeydown(event, chemicalFamily, chemicalFamilySearch)
}

function onChemicalFamilySearch(value) {
  onSemicolonArraySearch(chemicalFamily, chemicalFamilySearch, value)
}

function onTypesSemicolonKeydown(event) {
  onSemicolonArrayKeydown(event, types, typesSearch)
}

function onTypesSearch(value) {
  onSemicolonArraySearch(types, typesSearch, value)
}

function normText(v) {
  return String(v || "").trim().toLowerCase().replace(/\s+/g, " ")
}

function casOverlaps(a, b) {
  const left = casArray(a)
  const right = new Set(casArray(b))
  return left.some(c => right.has(c))
}

function trimmedOptionFilter(value, query, item) {
  const q = normText(query)
  if (!q) return true

  const raw = item?.raw || item || {}
  const haystack = [
    value,
    raw.label,
    raw.name,
    raw.value,
    casArray(raw.cas).join(" ")
  ]
    .map(v => String(v || "").toLowerCase())
    .join(" ")

  return haystack.includes(q)
}


/* ---------------- Validation ---------------- */
const casError = computed(() => {
  const v = String(newCas.value || "").trim()
  if (!v) return "CAS is required."
  if (!/^[A-Z0-9-]+$/.test(v)) return "CAS can only contain A–Z, 0–9 and dashes (-)."
  return ""
})

const nameError = computed(() => {
  const v = String(newName.value || "").trim()
  if (!v) return "Name is required."
  return ""
})

const concError = computed(() => {
  const n = Number(newConcentration.value)
  if (!Number.isFinite(n)) return "Concentration must be a number."
  if (n < 0 || n > 100) return "Concentration must be between 0 and 100."
  return ""
})

const quantityError = computed(() => {
  if (quantity.value == null || quantity.value === "") return ""
  return isPositiveNumber(quantity.value) ? "" : "Quantity must be > 0."
})

const priceError = computed(() => {
  if (price.value == null || price.value === "") return ""
  return isPositiveNumber(price.value) ? "" : "Price must be > 0."
})

const ifraMaxLimitError = computed(() => {
  if (ifraMaxLimit.value == null || ifraMaxLimit.value === "") return ""
  return isPositiveNumber(ifraMaxLimit.value) ? "" : "IFRA Max Limit must be > 0."
})

const canSubmit = computed(() => !casError.value && !nameError.value && !concError.value &&
  (!ghsPicked.value || canAddGhsClassification.value))

/* ---------------- IFRA & Allergen option lists ---------------- */
function optionName(e) {
  return Array.isArray(e?.names)
    ? String(e.names[0] || "").trim()
    : String(e?.inci || e?.name || "").trim()
}

function buildOptionList(arr, prefix) {
  const source = Array.isArray(arr) ? arr : []
  return source
    .map((e, idx) => {
      const cas = casArray(e?.cas)
      const name = optionName(e)
      if (!cas.length && !name) return null

      const idPart = e?.id != null ? String(e.id) : `${idx}`
      return {
        cas,
        name,
        label: `${name || "Unknown"} - ${cas.length ? cas.join(", ") : "-"}`,
        value: `${prefix}::${idPart}::${cas.join("|")}::${name || ""}`
      }
    })
    .filter(Boolean)
}

const ifraOptions = computed(() => buildOptionList(rawIfra51, "ifra"))

const allergenOptions = computed(() => buildOptionList(rawAllergens, "allergen"))

function findOptionByValue(options, value) {
  const v = String(value || "")
  return options.find((x) => x.value === v) || null
}

function findMatchingOption(options, picked) {
  const pickedCas = casArray(picked?.cas)
  const pickedName = normText(picked?.name)

  return (Array.isArray(options) ? options : []).find((opt) => casOverlaps(opt?.cas, pickedCas)) ||
    (Array.isArray(options) ? options : []).find((opt) => pickedName && normText(opt?.name) === pickedName) ||
    null
}

function addOrUpdateCompositionItem(listRef, picked, pct) {
  if (!picked || !isPct(pct)) return

  const item = {
    cas: [...casArray(picked.cas)],
    name: picked.name,
    concentration: Number(pct)
  }

  const current = Array.isArray(listRef.value) ? [...listRef.value] : []
  const idx = current.findIndex((x) =>
    casOverlaps(x?.cas, item.cas) ||
    (normText(x?.name) && normText(x?.name) === normText(item.name))
  )

  if (idx >= 0) {
    current[idx] = {
      ...current[idx],
      ...item
    }
  } else {
    current.push(item)
  }

  listRef.value = current
}

function addIfraListItem() {
  const picked = findOptionByValue(ifraOptions.value, ifraPicked.value)
  const pct = Number(ifraPickedPct.value)

  if (!picked || !isPct(pct)) return

  addOrUpdateCompositionItem(ifraList, picked, pct)

  // If the same CAS/name exists in allergens.json, add/update it there as well.
  const matchingAllergen = findMatchingOption(allergenOptions.value, picked)
  if (matchingAllergen) {
    addOrUpdateCompositionItem(allergenList, matchingAllergen, pct)
  }

  ifraPicked.value = null
  ifraPickedPct.value = null
}

function addAllergenListItem() {
  const picked = findOptionByValue(allergenOptions.value, allergenPicked.value)
  const pct = Number(allergenPickedPct.value)

  if (!picked || !isPct(pct)) return

  addOrUpdateCompositionItem(allergenList, picked, pct)

  // If the same CAS/name exists in ifra51.json, add/update it there as well.
  const matchingIfra = findMatchingOption(ifraOptions.value, picked)
  if (matchingIfra) {
    addOrUpdateCompositionItem(ifraList, matchingIfra, pct)
  }

  allergenPicked.value = null
  allergenPickedPct.value = null
}


function getNextIngredientId() {
  const ids = (Array.isArray(props.items) ? props.items : [])
    .map(x => Number(x?.id))
    .filter(n => Number.isFinite(n))
  return ids.length ? Math.max(...ids) + 1 : 1
}

async function saveIngredientJsonFile({ mode, key, ingredient }) {
  const result = await $fetch("/api/ingredients", {
    method: "POST",
    body: { mode, key, ingredient }
  })
  if (result?.ok !== true) throw new Error("The ingredient save was not confirmed.")
  return result
}

/* ---------------- Submit ---------------- */
async function confirmSave() {
  if (isSavingIngredient.value || !canSubmit.value) return
  if (ghsPicked.value) addGhsClassificationItem()
  isSavingIngredient.value = true
  ingredientSaveError.value = ""

  try {
    const payload = {
      cas: sanitizeCas(newCas.value).trim(),
      name: String(newName.value || "").trim(),
      inci: String(inciName.value || "").trim() || null,
      concentration: Math.max(0, Math.min(100, Number(newConcentration.value))),
      ec: String(ec.value || "").trim() || null,
      euReach: String(euReach.value || "").trim() || null,
      ghsClassification: normaliseGhsCodes(ghsClassification.value),
      ghsCategory: normaliseGhsCategories(ghsCategory.value, ghsClassification.value),
      sdsLink: String(sdsLink.value || "").trim() || null,
      aicisCategory: String(aicisCategory.value || "Uncategorised"),

      synonyms: nonEmptyArray(synonyms.value),
      tenacity: tenacity.value == null || tenacity.value === "" ? null : Math.max(0, Number(tenacity.value)),
      solvent: String(solvent.value || "").trim() || null,
      description: String(description.value || "").trim() || null,
      tags: nonEmptyArray(tags.value),
      strength: String(strength.value || "").trim() || null,
      isAllergen: !!isAllergen.value,
      ifraMaxLimit: ifraMaxLimit.value == null || ifraMaxLimit.value === "" ? null : Number(ifraMaxLimit.value),
      supplier: String(supplier.value || "").trim() || null,
      manufacturer: String(manufacturer.value || "").trim() || null,
      quantity: quantity.value == null || quantity.value === "" ? null : Number(quantity.value),
      price: price.value == null || price.value === "" ? null : Number(price.value),
      scentFamily: nonEmptyArray(scentFamily.value),
      chemicalFamily: nonEmptyArray(chemicalFamily.value),
      type: nonEmptyArray(types.value),

      // ✅ store only cas, name, concentration (%)
      ifraList: Array.isArray(ifraList.value) ? ifraList.value.map(x => ({
        cas: Array.isArray(x.cas) ? [...x.cas] : primaryCas(x.cas),
        name: x.name,
        concentration: Number(x.concentration) || 0
      })) : [],

      allergenList: Array.isArray(allergenList.value) ? allergenList.value.map(x => ({
        cas: Array.isArray(x.cas) ? [...x.cas] : primaryCas(x.cas),
        name: x.name,
        concentration: Number(x.concentration) || 0
      })) : []
    }


    if (!isEditing.value) {
      const newId = getNextIngredientId()
      payload.id = newId
      payload.key = String(newId)
    } else if (editOriginalKey.value != null) {
      // Preserve the original ID. A chemical CAS can belong to many ingredient records.
      const existing = (Array.isArray(props.items) ? props.items : [])
        .find(item => String(item?.id ?? "") === String(editOriginalKey.value))
      if (existing?.id != null) payload.id = existing.id
    }

    // Explicit empty safety values clear existing metadata in merge-based saves.
    const safetyFields = new Set(["ec", "euReach", "ghsClassification", "ghsCategory", "sdsLink"])
    for (const k of Object.keys(payload)) {
      const v = payload[k]
      if (safetyFields.has(k)) continue
      if (v === null) delete payload[k]
      if (Array.isArray(v) && v.length === 0) {
        if (k !== "ifraList" && k !== "allergenList") delete payload[k]
      }
    }

    if (isEditing.value) {
      await saveIngredientJsonFile({
        mode: "update",
        key: editOriginalKey.value,
        ingredient: payload
      })
      emit("update-ingredient", { key: editOriginalKey.value, updated: payload })
    } else {
      await saveIngredientJsonFile({
        mode: "append",
        key: payload.key || payload.id || payload.cas,
        ingredient: payload
      })
      emit("create-ingredient", payload)
    }
    addDialog.value = false
  } catch (err) {
    ingredientSaveError.value = "Could not confirm the save. Your changes are still here. Please try again."
    console.error("Could not save ingredient.", err)
  } finally {
    isSavingIngredient.value = false
  }
}
</script>

<style scoped>
.save-error-alert {
  flex: 1 0 100%;
  width: 100%;
}

.ingredient-editor-dialog {
  display: flex;
  flex-direction: column;
  max-height: calc(100dvh - 48px);
  overflow: hidden;
}

.ingredient-editor-dialog > .v-card-title,
.ingredient-editor-dialog > .v-card-actions {
  flex-shrink: 0;
}

.ingredient-editor-dialog > .v-card-text {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}

table { border-collapse: collapse; }
td, th { padding: 6px 8px; border-bottom: 1px solid #e0e0e0; vertical-align: top; }
th { font-weight: 600; }

.ingredients-table-scroll { flex: 1 1 auto; min-height: 0; overflow-y: auto; }

.form-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.82);
  margin-bottom: 2px;
}

.light-separator {
  opacity: 0.55;
}

.form-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  width: 100%;
}

.field-1-3 {
  flex: 1 1 calc(33.333% - 8px);
  min-width: 80px;
}

.field-2-3 {
  flex: 2 1 calc(66.666% - 8px);
  min-width: 280px;
}

.field-30 {
  flex: 0 1 calc(30% - 6px);
  min-width: 220px;
}

.field-70 {
  flex: 1 1 calc(70% - 6px);
  min-width: 320px;
}

.field-50 {
  flex: 1 1 calc(50% - 6px);
  min-width: 240px;
}

.field-full {
  flex: 1 1 100%;
  min-width: 0;
}

.field-compact {
  flex: 0 1 320px;
  min-width: 220px;
}

.pick-field {
  flex: 1 1 360px;
  min-width: 280px;
}

.pct-field {
  flex: 0 1 220px;
  min-width: 180px;
}

.regulatory-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ingredients-toolbar {
  flex: 0 0 auto;
  flex-wrap: wrap;
  gap: 8px;
}

.ingredients-toolbar-actions {
  max-width: 100%;
  flex-wrap: wrap;
}

.ingredient-filters-panel {
  flex: 0 0 auto;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 12px;
}

.filters-grid {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(260px, 1fr) minmax(240px, 0.8fr);
  gap: 12px;
  align-items: start;
}

.filter-section {
  min-width: 0;
}

.active-filter-chips {
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.ingredients-table-scroll thead th {
  position: sticky;
  top: 0;
  z-index: 5;
  background-color: rgb(var(--v-theme-tableHeader, 245, 245, 245)) !important;
  background-clip: padding-box;
  box-shadow: 0 1px 0 #e0e0e0;
}

.ingredients-table-scroll thead tr,
.table-header-row {
  background-color: rgb(var(--v-theme-tableHeader, 245, 245, 245)) !important;
}

@media (max-width: 960px) {
  .filters-grid {
    grid-template-columns: 1fr;
  }
}


.info-bottom-actions {
  margin-top: 34px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}


.composition-add-btn {
  align-self: center;
}

.selected-composition-section {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.selected-composition-row {
  padding: 4px 6px;
  border-radius: 6px;
}


.filter-toggle-wrap {
  width: 82px;
  flex: 0 0 auto;
  display: flex;
  justify-content: flex-end;
  overflow: hidden;
  transition: width 180ms ease;
}

.filter-toggle-wrap.is-open {
  width: 126px;
}

.filter-toggle-btn {
  width: 100%;
  min-width: 100%;
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  transition: width 180ms ease;
}

.filter-toggle-btn :deep(.v-btn__content) {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.filter-label {
  width: 100%;
  text-align: center;
  white-space: nowrap;
  transition: opacity 140ms ease, transform 180ms ease;
}

.hide-filters-label {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: translateX(8px);
}

.filter-toggle-wrap.is-open .filters-label {
  opacity: 0;
  transform: translateX(-8px);
}

.filter-toggle-wrap.is-open .hide-filters-label {
  opacity: 1;
  transform: translateX(0);
}



.mobile-row-detail,
.mobile-actions-trigger {
  display: none;
}

.desktop-actions {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  flex-wrap: nowrap;
}

.ingredients-table {
  table-layout: auto;
}

.ingredients-table-scroll {
  overflow-x: hidden !important;
}

@media (max-width: 900px) {
  .ingredients-toolbar {
    align-items: flex-start !important;
    flex-wrap: wrap;
    gap: 8px;
  }

  .ingredients-toolbar > h2 {
    flex: 1 1 100%;
  }

  .ingredients-toolbar-actions {
    width: 100%;
    justify-content: flex-end;
    flex-wrap: wrap;
  }

  .ingredient-filters-panel {
    max-width: 100%;
    overflow: hidden;
  }

  .filters-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .filter-section,
  .filter-section :deep(.v-field),
  .filter-section :deep(.v-input),
  .filter-section :deep(.v-autocomplete),
  .filter-section :deep(.v-text-field) {
    min-width: 0 !important;
    max-width: 100%;
  }

  .filter-section .d-flex {
    flex-wrap: wrap;
  }

  .filter-section .d-flex > * {
    min-width: 0;
    flex: 1 1 140px;
  }

  .field-1-3,
  .field-2-3,
  .field-30,
  .field-70,
  .field-50,
  .field-compact,
  .pick-field,
  .pct-field {
    min-width: 0;
    flex-basis: 100%;
  }
}

@media (max-width: 760px) {
  .ingredients-table {
    table-layout: fixed;
    width: 100%;
  }

  .cas-col,
  .conc-col,
  .solvent-col,
  .price-col {
    display: none;
  }

  .name-col {
    width: auto;
  }

  .actions-col {
    width: 48px;
    text-align: right;
  }

  .mobile-row-detail,
  .mobile-actions-trigger {
    display: block;
  }

  .desktop-actions {
    display: none;
  }

  .ingredients-table td,
  .ingredients-table th {
    padding: 6px 4px;
  }

  .ingredients-table-scroll {
    overflow-x: hidden !important;
  }
}

@media (max-width: 520px) {
  .filter-toggle-wrap {
    width: 100%;
  }

  .filter-toggle-wrap.is-open {
    width: 100%;
  }

  .ingredients-toolbar-actions {
    justify-content: stretch;
  }

  .ingredients-toolbar-actions > * {
    flex: 1 1 100%;
  }

  .filter-toggle-btn,
  .ingredients-toolbar-actions > .v-btn {
    width: 100%;
  }
}

@media (max-width: 760px) {
  .actions-header-label {
    display: none;
  }
}

</style>
