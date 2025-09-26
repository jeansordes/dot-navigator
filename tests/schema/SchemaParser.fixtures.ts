// Test fixtures for SchemaParser tests

export const basicSchemaYaml = `
version: 1
schemas:
  - id: root
    parent: root
    namespace: true
    children:
      - type: schema
        id: notes
  - id: notes
    title: Notes
    pattern:
      type: static
      value: notes
    children:
      - type: note
        id: notes.index
`;

export const choicePatternYaml = `
schemas:
  - id: projects
    pattern:
      type: choice
      items:
        - value: web
        - value: app
    children:
      - tasks
      - type: note
        id: projects.index
  - id: tasks
    pattern:
      type: static
      value: tasks
`;

export const invalidSchemaYaml = `
schemas:
  - title: Missing id
    children:
      - {}
`;

export const jsonInYamlCodeblock = `---
created: 2025-09-23
---

\`\`\`yaml
{
  "version": 1,
  "schemas": [
    {
      "id": "Notes",
      "parent": "root",
      "namespace": true,
      "children": [
        {
          "id": "prj-template",
          "type": "schema"
        }
      ]
    },
    {
      "id": "prj-template",
      "parent": "Notes",
      "pattern": {
        "type": "regex",
        "value": "^prj[._](?!.*\\\\b(ideas|roadmap)\\\\b).*"
      },
      "children": [
        {
          "id": "roadmap",
          "type": "note"
        },
        {
          "id": "ideas",
          "type": "note"
        }
      ]
    }
  ]
}
\`\`\`
`;

export const jsonInJsonCodeblock = `---
title: My Config
---

\`\`\`json
{
  "version": 1,
  "schemas": [
    {
      "id": "test",
      "children": [
        {
          "type": "note",
          "id": "test.note"
        }
      ]
    }
  ]
}
\`\`\`
`;

export const regularYamlContent = `---
title: Regular YAML
---

version: 1
schemas:
  - id: test
    children:
      - type: note
        id: test.note
`;

export const rawJsonContent = `Some text before
{
  "version": 1,
  "schemas": [
    {
      "id": "raw-json-test",
      "children": []
    }
  ]
}
Some text after`;

export const jsonInMdFile = `---
created: 2025-09-26
---

{
  "version": 1,
  "schemas": [
    {
      "id": "md-json-test",
      "children": []
    }
  ]
}
`;

export const yamlInMdCodeblock = `---
created: 2025-09-26
---

\`\`\`yaml
version: 1
schemas:
  - id: md-yaml-test
    children: []
\`\`\`
`;

export const yamlInUnspecifiedCodeblock = `---
created: 2025-09-26
---

\`\`\`
version: 1
schemas:
  - id: md-unspecified-test
    children: []
\`\`\`
`;
