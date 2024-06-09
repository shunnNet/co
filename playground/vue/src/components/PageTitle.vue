```vue
<template>
  <component :is="'h' + level" style="color: yellow;">
    {{ title }}
    <p>{{ description }}</p>
  </component>
</template>

<script setup>
import { defineProps } from 'vue'

const props = defineProps({
  level: {
    type: Number,
    required: true,
    validator: value => value >= 1 && value <= 6
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  }
})
</script>

<style scoped>
p {
  margin: 0;
}
</style>
```