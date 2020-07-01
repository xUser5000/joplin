import CommandService, { CommandRuntime, CommandDeclaration } from '../../../lib/services/CommandService';
const { _ } = require('lib/locale');

export const declaration:CommandDeclaration = {
	name: 'selectTemplate',
	// TODO: need to create createNoteFromTemplate, createTodoFromTemplate, insertTemplate
};

export const runtime = (comp:any):CommandRuntime => {
	return {
		execute: async ({ noteType }:any) => {
			comp.setState({
				promptOptions: {
					label: _('Template file:'),
					inputType: 'dropdown',
					value: comp.props.templates[0], // Need to start with some value
					autocomplete: comp.props.templates,
					onClose: async (answer:any) => {
						if (answer) {
							if (noteType === 'note' || noteType === 'todo') {
								CommandService.instance().execute('newNote', { template: answer.value, isTodo: noteType === 'todo' });
							} else {
								comp.props.dispatch({
									type: 'WINDOW_COMMAND',
									name: 'insertTemplate',
									value: answer.value,
								});
							}
						}

						comp.setState({ promptOptions: null });
					},
				},
			});
		},
	};
};
