import { Enquiry } from '../sections/Enquiry'
import { HomeHero } from '../sections/HomeHero'
import { Process } from '../sections/Process'
import { Ways } from '../sections/Ways'
import { Worlds } from '../sections/Worlds'

export function Home() {
  return (
    <>
      <HomeHero />
      <Worlds />
      <Ways />
      <Process />
      <Enquiry />
    </>
  )
}
