<template>
  <div>
    <h2>Comments:</h2>
    <ul>
      <li>Comment 1</li>
      <li>Comment 2</li>
      <li>Comment 3</li>
    </ul>
  </div>
</template>

<script setup>
import { ref } from 'vue'
defineProps({
  personId: {
    type: Number,
    required: true,
  },
})
</script>

<style scoped>
ul {
  list-style-type: none;
  padding: 0;
}
li {
  margin-bottom: 10px;
}
</style>
