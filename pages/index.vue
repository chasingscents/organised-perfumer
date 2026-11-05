<!-- pages/index.vue -->
<template>
  <v-container class="py-10">
    <v-row justify="center">
      <v-col cols="12" md="8" lg="6">
        <v-card class="pa-6" elevation="2">
          <v-card-title class="text-h5 mb-2">
            Welcome
          </v-card-title>
          <v-card-text class="mb-4 text-h6">
            <div class="intro">
              <p>This is a sample site. Any changes you make will not persist.</p>
              <p>Desktop use is recommended.</p>
              <br>
              <p>If you would like to save any private formulas, it is highly recommended to download the source at 
                <a href="https://github.com/chasingscents/organised-perfumer" target="_blank" rel="noopener noreferrer">GitHub</a> 
                and set this website up locally on your own computer.</p>
            </div>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn color="btnImportant" to="/ingredient-organiser" router variant="flat">
              Open Ingredient Organiser
            </v-btn>
            <v-spacer />
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
</script>
