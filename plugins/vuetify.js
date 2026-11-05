import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import colors from 'vuetify/util/colors'

export default defineNuxtPlugin((nuxtApp) => {
  const vuetify = createVuetify({
    components,
    directives,
    theme: {
      defaultTheme: 'light',
      themes: {
       light: {
          dark: false,
          colors: {
            primary: '#f5f2eb',
            secondary: '#f5f2eb',
            disabled: colors.grey.darken2,
            body: colors.grey.lighten3,
            card: '#FFFFFF',
            footer: '#8B8C8A',
            save: colors.blue.darken2,
            allergen: '#685ca3',
            bgAccent: colors.lime.lighten5,
            bgHeader: colors.grey.lighten2,
            bgPrimary: colors.lime.lighten1,
            bgSubtle: '#E0E1D2',
            btnAdd: '#7E7D73',
            btnActive: '#474A13',
            btnConfirm: '#33C0CA',
            btnDelete: colors.red.darken4,
            btnEdit: colors.grey.darken4,
            btnImportant: '#ca3d33',
            btnImport: '#ddeef4',
            btnSave: '#e7fbf9',
            btnSubtle: colors.grey.lighten4,
            loading: '#474A13'
          },
        },
      }
    },
  })

  nuxtApp.vueApp.use(vuetify)
})
