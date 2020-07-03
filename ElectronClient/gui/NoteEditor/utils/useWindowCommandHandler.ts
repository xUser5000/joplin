import { useEffect } from 'react';
import { FormNote } from './types';
import editorCommandDeclarations from '../commands/editorCommandDeclarations';
import CommandService, { CommandDeclaration,  CommandRuntime } from '../../../lib/services/CommandService';
const { time } = require('lib/time-utils.js');
const { reg } = require('lib/registry.js');

const commandsWithDependencies = [
	require('../commands/showLocalSearch'),
	require('../commands/focusElementNoteTitle'),
	require('../commands/focusElementNoteBody'),
];

interface HookDependencies {
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
		isEnabled: (props:any) => {
			return !!props.noteId;
		},
		mapStateToProps: (state:any) => {
			return {
				noteId: state.selectedNoteIds.length === 1 ? state.selectedNoteIds[0] : null,
			};
		},
	};
}

export default function useWindowCommandHandler(dependencies:HookDependencies) {
	const { formNote, setShowLocalSearch, noteSearchBarRef, editorRef, titleInputRef, saveNoteAndWait } = dependencies;

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
}
