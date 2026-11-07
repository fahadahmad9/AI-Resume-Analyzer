function Stepper({ activeStep }) {
  return <ol className="stepper" aria-label="Resume workflow">{[['1', 'Upload'], ['2', 'Analysis'], ['3', 'Job match']].map(([number, label]) => <li className={activeStep >= Number(number) ? 'step-active' : ''} key={number}><span>{number}</span>{label}</li>)}</ol>
}

export default Stepper
