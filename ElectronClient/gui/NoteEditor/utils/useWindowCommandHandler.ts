import { useEffect } from 'react';
import { FormNote } from './types';
import editorCommandDeclarations from '../commands/editorCommandDeclarations';
import CommandService, { CommandDeclaration,  CommandRuntime } from '../../../lib/services/CommandService';
const { time } = require('lib/time-utils.js');
const { reg } = require('lib/registry.js');

const commandsWithDependencies = [
	require('../commands/startExternalEditing'),
	require('../commands/stopExternalEditing'),
	require('../commands/showLocalSearch'),
];

interface HookDependencies {
	windowCommand: any,
	formNote:FormNote,
	setShowLocalSearch:Function,
	dispatch:Function,
	noteSearchBarRef:any,
	editorRef:any,
	titleInputRef:any,
	saveNoteAndWait: Function,
}

function editorCommandRuntime(declaration:CommandDeclaration, editorRef:any):CommandRuntime {
	return {
		execute: (props:any) => {
			console.info('Running editor command:', declaration.name, props);
			if (!editorRef.current.execCommand) {
				reg.logger().warn('Received command, but editor cannot execute commands', declaration.name);
			} else {
				const execArgs = {
					name: declaration.name,
					value: props.value,
				};

				if (declaration.name === 'insertDateTime') {
					execArgs.name = 'insertText';
					execArgs.value = time.formatMsToLocal(new Date().getTime());
				}

				editorRef.current.execCommand(execArgs);
			}
		},
	};
}

export default function useWindowCommandHandler(dependencies:HookDependencies) {
	const { windowCommand, dispatch, formNote, setShowLocalSearch, noteSearchBarRef, editorRef, titleInputRef, saveNoteAndWait } = dependencies;

	useEffect(() => {
		if (editorRef.current) {
			for (const declaration of editorCommandDeclarations) {
				CommandService.instance().registerRuntime(declaration.name, editorCommandRuntime(declaration, editorRef));
			}
		}

		return () => {
			for (const declaration of editorCommandDeclarations) {
				CommandService.instance().unregisterRuntime(declaration.name);
			}
		};
	}, [editorRef.current]);

	useEffect(() => {
		const dependencies = {
			formNote,
			editorRef,
			saveNoteAndWait,
			setShowLocalSearch,
			noteSearchBarRef,
			titleInputRef,
		};

		for (const command of commandsWithDependencies) {
			CommandService.instance().registerRuntime(command.declaration.name, command.runtime(dependencies));
		}

		return () => {
			for (const command of commandsWithDependencies) {
				CommandService.instance().unregisterRuntime(command.declaration.name);
			}
		};
	}, [formNote, saveNoteAndWait]);

	useEffect(() => {
		async function processCommand() {
			if (!windowCommand) return;

			throw new Error(`Calling NoteEditor::useWindowCommandHandler:${windowCommand.name}`);

			// const command = windowCommand;

			// if (!command || !formNote) return;

			// reg.logger().warn('NoteEditor::useWindowCommandHandler:', command);

			// const editorCmd: EditorCommand = { name: '', value: command.value };
			// let fn: Function = null;

			// // These commands can be forwarded directly to the note body editor
			// // without transformation.
			// const directMapCommands = [
			// 	'textCode',
			// 	'textBold',
			// 	'textItalic',
			// 	'textLink',
			// 	'attachFile',
			// 	'textNumberedList',
			// 	'textBulletedList',
			// 	'textCheckbox',
			// 	'textHeading',
			// 	'textHorizontalRule',
			// ];

			// if (directMapCommands.includes(command.name)) {
			// 	CommandService.instance().execute(command.name, { value: command.value });
			// 	dispatch({
			// 		type: 'WINDOW_COMMAND',
			// 		name: null,
			// 	});
			// 	return;

			// } else if (command.name === 'insertTemplate') {
			// 	editorCmd.name = 'insertText';
			// 	editorCmd.value = TemplateUtils.render(command.value);
			// }

			// // if (command.name === 'focusElement' && command.target === 'noteTitle') {
			// // 	fn = () => {
			// // 		if (!titleInputRef.current) return;
			// // 		titleInputRef.current.focus();
			// // 	};
			// // }

			// // if (command.name === 'focusElement' && command.target === 'noteBody') {
			// // 	editorCmd.name = 'focus';
			// // }

			// reg.logger().debug('NoteEditor::useWindowCommandHandler: Dispatch:', editorCmd, fn);

			// if (!editorCmd.name && !fn) return;

			// dispatch({
			// 	type: 'WINDOW_COMMAND',
			// 	name: null,
			// });

			// requestAnimationFrame(() => {
			// 	if (fn) {
			// 		fn();
			// 	} else {
			// 		if (!editorRef.current.execCommand) {
			// 			reg.logger().warn('Received command, but editor cannot execute commands', editorCmd);
			// 		} else {
			// 			editorRef.current.execCommand(editorCmd);
			// 		}
			// 	}
			// });
		}

		processCommand();
	}, [windowCommand, dispatch, formNote, saveNoteAndWait]);
}
