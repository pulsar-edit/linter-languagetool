/* eslint-disable
    camelcase,
    no-empty,
    no-undef,
    no-var,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
import rp from 'request-promise-native'
import lthelper from './ltserver-helper'
let LinterProvider

export default LinterProvider = (function () {
  let categries_map
  let getPostDataDict
  let linterMessagesForData
  LinterProvider = class LinterProvider {
    static initClass () {
      categries_map = {
        CASING: 'error',
        COLLOCATIONS: 'error',
        COLLOQUIALISMS: 'info',
        COMPOUNDING: 'error',
        CONFUSED_WORDS: 'info',
        CORRESPONDENCE: 'error',
        EMPFOHLENE_RECHTSCHREIBUNG: 'info',
        FALSE_FRIENDS: 'info',
        GENDER_NEUTRALITY: 'info',
        GRAMMAR: 'error',
        HILFESTELLUNG_KOMMASETZUNG: 'warning',
        IDIOMS: 'info',
        MISC: 'warning',
        MISUSED_TERMS_EU_PUBLICATIONS: 'warning',
        NONSTANDARD_PHRASES: 'info',
        PLAIN_ENGLISH: 'info',
        PROPER_NOUNS: 'error',
        PUNCTUATION: 'error',
        REDUNDANCY: 'error',
        REGIONALISMS: 'info',
        REPETITIONS: 'info',
        SEMANTICS: 'warning',
        STYLE: 'info',
        TYPOGRAPHY: 'warning',
        TYPOS: 'error',
        WIKIPEDIA: 'info'
      }

      getPostDataDict = function (editorContent) {
        const post_data_dict = {
          language: 'auto',
          text: editorContent,
          motherTongue: atom.config.get('linter-languagetool.motherTongue')
        }

        if ((atom.config.get('linter-languagetool.preferredVariants')).length > 0) {
          post_data_dict.preferredVariants = atom.config.get('linter-languagetool.preferredVariants').join()
        }
        if ((atom.config.get('linter-languagetool.disabledCategories')).length > 0) {
          post_data_dict.disabledCategories = atom.config.get('linter-languagetool.disabledCategories').join()
        }
        if ((atom.config.get('linter-languagetool.disabledRules')).length > 0) {
          post_data_dict.disabledRules = atom.config.get('linter-languagetool.disabledRules').join()
        }

        return post_data_dict
      }

      linterMessagesForData = function (data, textBuffer, editorPath) {
        const messages = []

        const matches = data.matches
        for (const match of Array.from(matches)) {
          const offset = match.offset
          const length = match.length
          var startPos = textBuffer.positionForCharacterIndex(offset)
          var endPos = textBuffer.positionForCharacterIndex(offset + length)

          let description = `*${match.rule.description}*\n\n(\`ID: ${match.rule.id}\`)`
          if (match.shortMessage) {
            description = `${match.message}\n\n${description}`
          } else {}

          const replacements = match.replacements.map(rep => ({
            title: rep.value,
            position: [startPos, endPos],
            replaceWith: rep.value
          }))
          const message = {
            location: {
              file: editorPath,
              position: [startPos, endPos]
            },
            severity: categries_map[match.rule.category.id] || 'error',
            description,
            solutions: replacements,
            excerpt: match.shortMessage || match.message
          }

          if (match.rule.urls) {
            message.url = match.rule.urls[0].value
          }

          messages.push(message)
        }
        return messages
      }
    }

    lint (TextEditor) {
      return new Promise(function (resolve) {
        if (!lthelper.ltinfo) {
          // Disable the linter if the server is not responding
          resolve([])
          return
        }

        const post_data = getPostDataDict(TextEditor.getText())

        const options = {
          method: 'POST',
          uri: lthelper.url,
          form: post_data,
          json: true
        }

        const editorPath = TextEditor.getPath()
        const textBuffer = TextEditor.getBuffer()

        return rp(options)
          .then(function (data) {
            const messages = linterMessagesForData(data, textBuffer, editorPath)
            return resolve(messages)
          })
          .catch(function (err) {
            console.log(err)
            atom.notifications.addError('Invalid output received from LanguageTool server', { detail: err.message })
            return resolve([])
          })
      })
    }
  }
  LinterProvider.initClass()
  return LinterProvider
})()
