import List from 'term-list'
import * as child from 'child_process'
import request from 'request'
import cheerio from 'cheerio'
import path from 'path'
import fs from 'fs'

const BASE_URL = 'http://ftp.mozilla.org'
const START_URL = 'http://ftp.mozilla.org/pub/firefox/nightly'

const handleKeyPressList = (props) => {
  const key = props.key
  const item = props.item
  const list = props.list
  const url = props.url

  switch (key.name) {
    case 'return':
      if ( item.match(/\.dmg/g) ) {
        list.stop()
        console.log('Extracting…')
        console.log(item)

        const fileName = 'firefoxnightly' + Math.random().toString().split('.').pop() + '.dmg'

        const w = fs.createWriteStream(path.join('/tmp', fileName))

        request(`${BASE_URL}${item}`)
          .pipe(w)

        w.on('finish', () => {
          const _child = child.exec(`hdiutil -quiet attach /tmp/${fileName}`)

          _child.on('close', () => {
            const __child = child.exec('cp -Rf "/Volumes/Nightly/FirefoxNightly.app" /Applications/FirefoxNightlyBackup.app')

            __child.on('close', () => {
              console.log('Finished!')
            })
          })
        })

      }
      else {
        run(`${BASE_URL}${item}`)
        list.stop()
        console.log('Loading…')
      }

      break
    case 'backspace':
      let newUrl = url.split('/')
      newUrl.pop()
      newUrl.pop()
      newUrl = newUrl.join('/')

      if( newUrl.length <= START_URL.length ) {
        run(`${START_URL}/`)
      }
      else {
        run(`${newUrl}\/`)
      }

      list.stop()
      console.log('Loading…')
      break
  }
}

const handleEmptyList = (props) => {
  const list = props.list

  list.stop()
}

const addElementsToList = (props) => {
  const el = props.el
  const i = props.i
  const list = props.list
  const $ = props.$

  const $el = $(el)
  const href = $el.attr('href')
  let text = $el.text()

  if(
    i !== 0 &&
    (
      text.match(/[0-9]+\//g) ||
      text.match(/central\//g) ||
      text.match(/\.dmg/g)
    )
  ) {
    text = text.replace(/-mozilla-central/i, '')

    list.add(href, text)
  }
}

const digestResponse = (props) => {
  const err = props.err
  const res = props.res
  const body = props.body
  const url = props.url

  const $ = cheerio.load(body)
  const list = new List({ marker: '❯ ', markerLength: 2 })

  const $links = $( $('table').find('td:nth-child(2) a').get().reverse() )

  $links.each((i, el) => {
    addElementsToList({
      i,
      el,
      list,
      $
    })
  })

  if ( list.items.length === 0 ) {
    list.add(null, 'Nothing here, please go back.') // @TODO handle this
  }

  list.start()

  list.on('keypress', (key, item) => {
    handleKeyPressList({
      key,
      item,
      url,
      list
    })
  })

  list.on('empty', () => {
    handleEmptyList({
      list
    })
  })
}

const run = (url) => {
  request(url,
    (err, res, body) => {
      digestResponse({
        err,
        res,
        body,
        url
      }
    )
  })
}

run(`${START_URL}/`)

