import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildFileDatasetTemplateSuggestion,
  buildJsonArrayPathOptions,
  renderTemplatePreview,
} from '../fileDatasetTemplateSuggestions.ts'

const jsonFile = {
  filename: 'dataset_cursos_online.json',
  content: JSON.stringify({
    dataset: 'catalogo_cursos_online',
    version: '1.0.0',
    courses: [
      {
        course_id: 'CRS-1001',
        title: 'Node.js para APIs',
        category: 'backend',
        level: 'intermediate',
        duration_hours: 12,
        price_brl: 199.9,
        tags: ['nodejs', 'api'],
        instructor: {
          name: 'Marina Costa',
          rating: 4.8,
        },
        published: true,
      },
    ],
    instructors: [
      { id: 'INS-1', name: 'Marina Costa' },
    ],
  }),
  mimeType: 'application/json',
}

test('detects JSON array paths from Extract From File uploads', () => {
  const options = buildJsonArrayPathOptions([jsonFile])

  assert.deepEqual(options.map((option) => option.value), ['courses', 'instructors'])
})

test('builds text template from Extract From File JSON upload and JSON path', () => {
  const suggestion = buildFileDatasetTemplateSuggestion([jsonFile], 'courses')

  assert.ok(suggestion)
  assert.match(suggestion.textTemplate, /title: {{ item\.title }}/)
  assert.match(suggestion.textTemplate, /tags: {{ item\.tags }}/)
  assert.match(suggestion.textTemplate, /instructor\.name: {{ item\.instructor\.name }}/)
  assert.equal('metadataTemplate' in suggestion, false)
})

test('renders template preview using the same item path placeholders as file loading', () => {
  const suggestion = buildFileDatasetTemplateSuggestion([jsonFile], 'courses')

  assert.ok(suggestion?.sampleData)
  const text = renderTemplatePreview(suggestion.textTemplate, suggestion.sampleData)

  assert.match(text, /title: Node\.js para APIs/)
  assert.match(text, /tags: \["nodejs","api"\]/)
})
