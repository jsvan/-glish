"""
Scrape wiktionary for all translations for a word
store list

for i, l in enumerate(listofenglishwords):
	sr, word, pos, level = l.split('\t')
	word = cleanword(word)
	for lang in allvocabs.keys():
		allvocabs[lang].append()
	englishvocab.append([word, i, level])
	get url:
		for all translation tables:
			for every language:
				allvocabs[LANGUAGE][word].append()

"""