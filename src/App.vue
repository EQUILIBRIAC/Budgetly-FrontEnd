<script setup>

</script>

<template>
<router-view></router-view>
</template>

<style>
/* Global reset for page chrome spacing */
html, body, #app { height: 100%; }
body { margin: 0; }

/* Modern finance typography */
:root {
  --font-sans: 'Manrope', 'Inter', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
}

html, body, #app { font-family: var(--font-sans); font-kerning: normal; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
h1, h2, h3, h4 { font-family: var(--font-sans); letter-spacing: .2px; }
small, .subtitle { letter-spacing: .1px; }
</style>
