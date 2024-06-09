<template>
  <div class="person-card">
    <img :src="person.photo" alt="Person photo" />
    <h2>{{ person.name }}</h2>
    <p>Age: {{ person.age }}</p>
    <p>{{ person.intro }}</p>
    <slot name="action"></slot>
  </div>
</template>

<script>
export default {
  props: {
    person: {
      type: Object,
      required: true,
    },
  },
}
</script>

<style scoped>
.person-card {
  border: 1px solid #ccc;
  padding: 16px;
  border-radius: 8px;
  text-align: center;
}
.person-card img {
  width: 100px;
  height: 100px;
  border-radius: 50%;
}
</style>
