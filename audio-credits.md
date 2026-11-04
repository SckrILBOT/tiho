# Звуки «Тихо»

Проверено 04.11.2026 по исходным страницам авторов и таблице Blanket. Атрибуция на сайте — `public/audio-credits.html`, доступна под управлением звуком.

| Слой | Автор и оригинал | Лицензия | Полученный файл |
| --- | --- | --- | --- |
| Поезд | SDLx — [Trains of the Yamanote Line](https://freesound.org/people/SDLx/sounds/259988/) | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) | [train.ogg в Blanket](https://github.com/rafaelmardojai/blanket/blob/master/data/resources/sounds/train.ogg) |
| Дождь | alex36917 — [rain ambience](https://freesound.org/people/alex36917/sounds/524605/) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | [rain.ogg в Blanket](https://github.com/rafaelmardojai/blanket/blob/master/data/resources/sounds/rain.ogg) |
| Ветер | felix.blume — [Wind blowing in a field in Texas, USA](https://freesound.org/people/felix.blume/sounds/217506/) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | [wind.ogg в Blanket](https://github.com/rafaelmardojai/blanket/blob/master/data/resources/sounds/wind.ogg) |

Предварительная обработка дождя и ветра для Blanket — Porrumentzio, указана в [таблице проекта](https://github.com/rafaelmardojai/blanket/blob/master/SOUNDS_LICENSING.md). Полученные OGG сохранены как `public/assets/audio/*-source.ogg`. Это уже сокращённые/обработанные версии оригинальных записей. Лицензия кода Blanket не подменяет лицензии аудио.

В «Тихо»: дождь обрезан до участка 12–60 с полученного файла; для поезда и ветра взяты полученные фрагменты полностью. Подготовлены круговые перекрытия 1.1/3/2 с, удалена постоянная составляющая, выровнена громкость, частота 22050 Гц, MP3 96 кбит/с. Скрипт — `scripts/prepare-audio.py`, измерения — `public/assets/audio/preparation.json`. Щелчок лампы — собственный короткий синтез в `public/audio-engine.js`, внешняя запись не использована.

BY требует сохранять авторство, название, ссылку на источник и лицензию, указывать обработку. Эти сведения размещены на странице авторов. На записи не накладываются дополнительные ограничения. CC0 не требует атрибуции; автор ветра указан добровольно.
