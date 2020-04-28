import { FormNote } from './types';

const HtmlToMd = require('lib/HtmlToMd');
const Note = require('lib/models/Note');

export async function htmlToMarkdown(html: string): Promise<string> {
	const htmlToMd = new HtmlToMd();
	let md = htmlToMd.parse(html, { preserveImageTagsWithSize: true });
	md = await Note.replaceResourceExternalToInternalLinks(md, { useAbsolutePaths: true });
	return md;
}

export async function formNoteToNote(formNote: FormNote): Promise<any> {
	return {
		id: formNote.id,
		title: formNote.title,
		body: formNote.body,
	};
}
