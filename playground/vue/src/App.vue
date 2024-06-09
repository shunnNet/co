<script setup>
import { ref } from 'vue'
// co
import PersonComment from './components/PersonComment.vue'
// co-end
import LikeButton from './components/LikeButton.vue'
import PersonCard from './components/PersonCard.vue'
import PersonProfolio from './components/PersonProfolio.vue'
import CustomCounter from './components/CustomCounter.vue'
import PageTitle from './components/PageTitle.vue'

const onPlus = (currentCount) => {
  console.log('counter plus', currentCount)
}
const onSub = (currentCount) => {
  console.log('counter sub', currentCount)
}
const count = ref(0)
const person = ref({
  id: 1,
  name: 'co',
  age: 18,
  photo: 'https://avatars.githubusercontent.com/u/22588905?v=4',
  intro: 'co is a front-end developer',
  profolio: [
    { title: 'Front-end', content: 'Vue, React, Angular' },
    { title: 'Back-end', content: 'Node.js, Express, Koa' },
    { title: 'Database', content: 'MongoDB, MySQL, Redis' },
    { title: 'DevOps', content: 'Docker, Nginx, Jenkins' },
  ],
})
</script>

<template>
  <div>
    <!-- 
      The PageTitle should accept the following props.
      And render h1~h6 based on the level prop.
      The title should has yellow color.
    -->
    <PageTitle :level="1" title="co demo" description="this is a co plugin demo app" />
    <PersonCard :person="person">
      <template #action>
        <LikeButton />
      </template>
    </PersonCard>
    <PersonProfolio :person="person" />
    <PersonComment :person-id="person.id" />
  </div>
</template>

<style scoped></style>
