<template>
  <button @click="onLike">Like</button>
</template>

<script setup>
import { ref } from 'vue'

const likes = ref(0)

const onLike = () => {
  likes.value += 1
  console.log('Liked', likes.value)
}
</script>

<style scoped>
button {
  background-color: #ffcc00;
  border: none;
  color: white;
  padding: 10px 20px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 16px;
}
</style>