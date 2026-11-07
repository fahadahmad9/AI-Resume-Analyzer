function Accordion({ title, children, defaultOpen = false }) {
  return <details className="accordion" open={defaultOpen}><summary>{title}</summary><div className="accordion-content">{children}</div></details>
}

export default Accordion
