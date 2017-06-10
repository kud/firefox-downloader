import List from 'term-list'
import * as child from 'child_process'
import request from 'request'
import cheerio from 'cheerio'
import path from 'path'
import fs from 'fs'

const run = (url) => {
  request(
    url,
    (err, res, body) => {
      const $ = cheerio.load(body)
      const list = new List({ marker: '❯ ', markerLength: 2 })

      $('table tr td:nth-child(2) a').each((i, el) => {
        const $el = $(el)
        const href = $el.attr('href')
        const text = $el.text()
        if(
          i !== 0 &&
          (
            text.match(/[0-9]+\//g) ||
            text.match(/central\//g) ||
            text.match(/\.dmg/g)
          )
        ) { list.add(href, text) }
      })

      list.start()

      list.on('keypress', (key, item) => {
        switch (key.name) {
          case 'return':
            if ( item.match(/\.dmg/g) ) {
              list.stop()
              console.log('Extracting…')
              console.log(item)

              const w = fs.createWriteStream(path.join('/tmp', 'test.dmg'))

              request(`http://ftp.mozilla.org${item}`)
                .pipe(w)

              w.on('finish', () => {
                const _child = child.exec('hdiutil attach /tmp/test.dmg')

                _child.on('close', () => {
                  const __child = child.exec('cp -R "/Volumes/Nightly/FirefoxNightly.app" /Applications/FirefoxNightlyBackup.app')

                  __child.on('close', () => {
                    console.log('finished!')
                  })
                })
              })

            }
            else {
              run(`http://ftp.mozilla.org${item}`)
              list.stop()
              console.log('Loading…')
            }

            break
          case 'backspace':
            let newUrl = url.split('/')
            newUrl.pop()
            newUrl.pop()
            newUrl = newUrl.join('/')

            run(`${newUrl}\/`)
            list.stop()
            console.log('Loading…')
            break
        }
      })

      list.on('empty', () => {
        list.stop()
      })
    }
  )
}

run('http://ftp.mozilla.org/pub/firefox/nightly/')

