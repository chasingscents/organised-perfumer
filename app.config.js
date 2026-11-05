export default defineAppConfig({
  ui: {
    // Primary colors
    primary: 'blue',
    gray: 'slate',
    
    // Component defaults
    button: {
      default: {
        size: 'md',
        color: 'primary',
        variant: 'solid'
      }
    },
    
    // Container sizes
    container: {
      constrained: 'max-w-7xl'
    }
  }
})