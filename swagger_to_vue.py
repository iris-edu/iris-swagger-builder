import sys
import json

def make_vue(operation):
    for p in operation['parameters']:
        if p['in'] == 'query':
            input_type = 'text-input'
            if p.get('format') == 'date-time':
                input_type = 'date-input'
            elif p['type'] == 'boolean':
                input_type = 'boolean-input'
            elif p.get('enum'):
                input_type = 'choice-input'
            elif p['type'] == 'number':
                pass
            yield '<%(input_type)s name="%(name)s"></%(input_type)s>' % {
                'input_type': input_type,
                'name': p['name']
            }

        '''
        <date-input name="starttime" label="Start Time"></date-input>
                <text-input name="endtime"></text-input>
                <text-input name="minmag"></text-input>
                <choice-input name="magtype"></choice-input>
                <boolean-input name="includearrivals" />
        '''

def build_vue(swagger, path='/query', method='get'):
    op = swagger['paths'][path][method]
    for f in make_vue(op):
        print f

if __name__ == '__main__':
    with open('example/swagger-event.json', 'rb') as f:
        swagger = json.load(f)
        build_vue(swagger)
