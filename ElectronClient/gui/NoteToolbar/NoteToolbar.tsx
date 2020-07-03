import * as React from 'react';
import CommandService from '../../lib/services/CommandService';
const { connect } = require('react-redux');
const { buildStyle } = require('lib/theme');
const Toolbar = require('../Toolbar.min.js');
const Folder = require('lib/models/Folder');
const { _ } = require('lib/locale');
const { substrWithEllipsis } = require('lib/string-utils');

interface ButtonClickEvent {
	name: string,
}

interface NoteToolbarProps {
	theme: number,
	style: any,
	folders: any[],
	watchedNoteFiles: string[],
	backwardHistoryNotes: any[],
	forwardHistoryNotes: any[],
	notesParentType: string,
	note: any,
	dispatch: Function,
	onButtonClick(event:ButtonClickEvent):void,
}

function styles_(props:NoteToolbarProps) {
	return buildStyle('NoteToolbar', props.theme, (/* theme:any*/) => {
		return {
			root: {
				...props.style,
				borderBottom: 'none',
			},
		};
	});
}

function useToolbarItems(props:NoteToolbarProps) {
	const { note, folders, watchedNoteFiles, notesParentType } = props;

	const toolbarItems = [];

	const selectedNoteFolder = Folder.byId(folders, note.parent_id);

	toolbarItems.push(
		CommandService.instance().commandToToolbarButton('historyBackward')
	);

	toolbarItems.push(
		CommandService.instance().commandToToolbarButton('historyForward')
	);

	if (selectedNoteFolder && ['Search', 'Tag', 'SmartFilter'].includes(notesParentType)) {
		toolbarItems.push({
			title: _('In: %s', substrWithEllipsis(selectedNoteFolder.title, 0, 16)),
			iconName: 'fa-book',
			onClick: () => {
				props.dispatch({
					type: 'FOLDER_AND_NOTE_SELECT',
					folderId: selectedNoteFolder.id,
					noteId: note.id,
				});
			},
		});
	}

	toolbarItems.push(CommandService.instance().commandToToolbarButton('showNoteProperties'));

	if (watchedNoteFiles.indexOf(note.id) >= 0) {
		toolbarItems.push(CommandService.instance().commandToToolbarButton('stopExternalEditing'));
	} else {
		toolbarItems.push(CommandService.instance().commandToToolbarButton('startExternalEditing'));
	}

	toolbarItems.push(CommandService.instance().commandToToolbarButton('editAlarm'));

	toolbarItems.push(CommandService.instance().commandToToolbarButton('setTags'));

	return toolbarItems;
}

function NoteToolbar(props:NoteToolbarProps) {
	const styles = styles_(props);
	const toolbarItems = useToolbarItems(props);
	return <Toolbar style={styles.root} items={toolbarItems} />;
}

const mapStateToProps = (state:any) => {
	return {
		folders: state.folders,
		watchedNoteFiles: state.watchedNoteFiles,
		backwardHistoryNotes: state.backwardHistoryNotes,
		forwardHistoryNotes: state.forwardHistoryNotes,
		notesParentType: state.notesParentType,
	};
};

export default connect(mapStateToProps)(NoteToolbar);
