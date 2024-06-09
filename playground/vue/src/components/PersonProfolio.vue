```vue
<template>
  <div>
    <h2>Profolio</h2>
    <ul>
      <li v-for="item in person.profolio" :key="item.title">
        <strong>{{ item.title }}:</strong> {{ item.content }}
      </li>
    </ul>
  </div>
</template>

<script setup>
import { defineProps } from 'vue'

const props = defineProps({
  person: {
    type: Object,
    required: true,
  },
})
</script>

<style scoped>
h2 {
  color: blue;
}
</style>
```