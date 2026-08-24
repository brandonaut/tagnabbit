import Tuner from "./Tuner"

export default function TunerPage() {
  return (
    <div className="max-w-2xl mx-auto py-4 px-4 flex flex-col items-center gap-4">
      <h1 className="m-0 text-2xl font-bold self-start">Tuner</h1>
      <Tuner variant="inline" defaultSize="large" defaultKey="C" defaultTemperament="et" />
    </div>
  )
}
