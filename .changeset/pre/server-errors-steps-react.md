---
'@whatsaaaa/form-builder-react': patch
---

In a form with steps, the errors your submit handler sets with Formisch's `setErrors`, like the messages of a server that rejects the input, now stay on their fields. Before, they were gone at once: after a submit that left errors, the steps validated the form again to find the step to go back to, which put the schema's result over them. The steps now read the errors the form has. A message on a field of an earlier step takes the user back to that step, with the field focused, like a form rule that fails there. The form's own error from a submit handler that throws stays too. The user's next edit still validates the form again, as in a form without steps.
