"""
Started with common word list from
https://en.wiktionary.org/wiki/Wiktionary:Frequency_lists/A_Frequency_Dictionary_of_Contemporary_American_English

Try words from https://en.wiktionary.org/wiki/animal/translations#Noun first, then
https://en.wiktionary.org/wiki/WORD

Scrape wiktionary for all translations for a word
"""

from wiki_scraper import Scraper
import time

def main():

	with open('../updated_language_packs/eng_todo.txt') as F:
		listofenglishwords = F.read().split('\n')

	scraper = Scraper()
	i = 0
	for i, word in enumerate(listofenglishwords):
		try:
			print('\r', i, '/', len(listofenglishwords), end='')
			scraper.html_to_filled_vocab_dict(word)

		except KeyboardInterrupt as e:
			input("Keyboard Interrupt detected. Waiting for button press...")
			print('\rRetrying: ', i, '/', len(listofenglishwords), end='')
			scraper.html_to_filled_vocab_dict(word, force=True)
		except Exception as e:
			print('\rRetrying: ', i, '/', len(listofenglishwords), end='. Waiting 4 seconds. ')
			time.sleep(4)
			scraper.html_to_filled_vocab_dict(word, force=True)


	print("\nsaving to disk")
	scraper.save_dict_overwrite(listofenglishwords)


if __name__ == "__main__":
	main()