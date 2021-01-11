https://github.com/jrutheiser/hugo-lithium-theme
hugo serve --bind="0.0.0.0"

In `hugo` directory:

	/snap/hugo/current/bin/hugo new about/index.md
	/snap/hugo/current/bin/hugo new links/index.md
	/snap/hugo/current/bin/hugo new post/intro.md  		-- Note in getting started guide it's `posts`....????
	make build or make deploy


In `archetypes/default.md` (overrides same file in theme):

	+++
	title = "{{ replace .Name "-" " " | title }}"
	date = "{{ .Date }}"

	+++

