const contentful = require('contentful');
const fs = require('fs-extra');
const slug = require('to-slug-case');

const PAGE_ID = 'page';

const turnObjectKeysToSlugCase = (object) => 
  Object.keys(object).reduce((renamedPropsObject, field) => {
    const slugCasedId = slug(field);
    renamedPropsObject[slugCasedId] = 
      // TODO: Check what other kind of object we could get.
      // This is adjusted for Rich Text
      typeof object[field] !== 'object' ? object[field] : object[field].content[0].content[0].value;
    return renamedPropsObject;
  }, {});

const client = contentful.createClient({
  accessToken: `{Replace for your Access Token}`,
  space: `{Replace for your Space Id}`,
});

console.log('Fetching Contentful data...');
console.time('fetch');

client.getLocales().then(({items}) => {
  items.forEach(({code}) => {
    fs.ensureDirSync(`./${code}`);

    client.getEntries({
      locale: code,
    }).then(({items}) => {

      const pages = items
        .filter(({ sys: { contentType: { sys: { id } } } }) => id === PAGE_ID)
        .map(({ fields: { name, components } }) => 
        ({
          name,
          componentIds: components.map(({ sys: { id } }) => id),
        }));
        
      pages.forEach(({componentIds, name}) => {
        const components = componentIds.reduce((componentsObject, componentId) => {
          const component = items.find(({ sys: { id } }) => id == componentId);
          const slugCasedId = slug(component.sys.contentType.sys.id);

          componentsObject[slugCasedId] = turnObjectKeysToSlugCase(component.fields);
          return componentsObject;
        }, {});

        fs.outputFile(`./${code}/${name}.json`, JSON.stringify(components, null, 2));
      })
    });
  });

  console.timeEnd('fetch');
  console.log('Contentful data fetched.')
});
