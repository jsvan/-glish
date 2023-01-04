"""
Started with common word list from
https://en.wiktionary.org/wiki/Wiktionary:Frequency_lists/A_Frequency_Dictionary_of_Contemporary_American_English

Try words from https://en.wiktionary.org/wiki/animal/translations#Noun first, then
https://en.wiktionary.org/wiki/WORD

Scrape wiktionary for all translations for a word
"""

import requests
import time
from bs4 import BeautifulSoup
from wiki_scraper import Scraper


"""
TODO:
Could be in the translation table, it gives you a link to SEE SOMEOTHER PAGE, and we should try that out.
<div class="pseudo NavFrame">
	<div class="NavHead" style="text-align: left;">
		a place where the dead are buried
		<span style="font-weight: normal">
			—
			<i>
				see
			</i>
		</span>
		<a href="/wiki/graveyard" title="graveyard">
			graveyard
		</a>
	</div>
</div>

ALSO:
seperate words by a comma, not a space.
"""
def main():

	with open('../updated_language_packs/eng_todo.txt') as F:
		listofenglishwords = F.read().split('\n')

	with open('../languagepacks/available_languages.txt') as F:
		lang_name2short = {x.split('\t')[0]:x.split('\t')[1] for x in F.read().split('\n')}
		all_languages = {uppercase(x):dict() for x in lang_name2short.keys()}

	scraper = Scraper()
	i = 0
	for i, word in enumerate(listofenglishwords):
		try:
			print('\r', i, '/', len(listofenglishwords), end='')
			scraper.tbls_to_filled_dict(word, all_languages)

		except KeyboardInterrupt as e:
			worderror(cpl_language_dict, word)
			input("Keyboard Interrupt detected. Waiting for button press...")

	print("\nsaving to disk")
	save_dict(all_languages, listofenglishwords)



if __name__ == "__main__":
	main()