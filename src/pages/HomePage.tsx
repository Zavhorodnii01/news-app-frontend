import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Container,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  CardActions,
  Link,
  Pagination,
  CardMedia,
  Box,
  Autocomplete,
  Grid,
} from '@mui/material';
import debounce from 'lodash.debounce';

interface ArticleDto {
  source: {
    name: string;
  };
  author: string | null;
  title: string;
  description: string;
  url: string;
  urlToImage: string;
  publishedAt: string;
  content: string | null;
}

interface CityDto {
  id: string;
  city: string;
  stateName: string;
  countyName: string;
  lat: string;
  lng: string;
  population: number | null;
  timezone: string;
}

const ARTICLES_PER_PAGE = 10;

const HomePage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [news, setNews] = useState<ArticleDto[]>([]);
  const [cityInfo, setCityInfo] = useState<CityDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const topRef = useRef<HTMLDivElement | null>(null);

  const fetchCities = async (query: string) => {
    if (!query.trim()) {
      setCityOptions([]);
      return;
    }

    setLoadingCities(true);
    try {
      const response = await fetch(
        `http://51.21.218.3:8080/api/cities?query=${encodeURIComponent(query)}`,
        {
          credentials: 'include',
        }
      );
      if (response.ok) {
        const data: string[] = await response.json();
        setCityOptions(data);
      } else {
        setCityOptions([]);
      }
    } catch (error) {
      console.error('Error fetching cities:', error);
      setCityOptions([]);
    } finally {
      setLoadingCities(false);
    }
  };

  const debouncedFetchCities = useMemo(() => debounce(fetchCities, 300), []);

  useEffect(() => {
    return () => {
      debouncedFetchCities.cancel();
    };
  }, [debouncedFetchCities]);

  const fetchCityNews = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a city and state.');
      return;
    }

    const matchedOption = cityOptions.find(
      (option) => option.toLowerCase() === searchQuery.toLowerCase()
    );
    const cityState = matchedOption || searchQuery;

    if (!cityState.includes(',')) {
      setError(
        'Please enter city and state separated by a comma (e.g., Miami, Florida).'
      );
      return;
    }

    const [city, stateName] = cityState.split(',').map((s) => s.trim());

    if (!city || !stateName) {
      setError('Invalid city or state name. Please check your input.');
      return;
    }

    setError(null);
    setLoading(true);
    setNews([]);
    setCityInfo(null);
    setCurrentPage(1);

    try {
      const cityInfoResponse = await fetch(
        `http://51.21.218.3:8080/api/cities/${encodeURIComponent(
          city
        )}/${encodeURIComponent(stateName)}`,
        {
          credentials: 'include',
        }
      );
      if (cityInfoResponse.ok) {
        const cityData: CityDto = await cityInfoResponse.json();
        setCityInfo(cityData);
      }

      const response = await fetch(
        `http://51.21.218.3:8080/api/news/${encodeURIComponent(
          city
        )}/${encodeURIComponent(stateName)}`,
        {
          method: 'GET',
          credentials: 'include',
        }
      );

      if (response.ok) {
        const data = await response.json();
        setNews(
          data.map((article: any) => ({
            ...article,
            publishedAt: article.publishedAtString || article.publishedAt, // Handle both cases
          }))
        );
      } else if (response.status === 401) {
        setError('Unauthorized: please enter your login and password.');
      } else {
        setError(
          `Error getting news: ${response.status} ${response.statusText}`
        );
      }
    } catch (err) {
      setError('Error getting news. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchGlobalNews = async () => {
    setLoading(true);
    setError(null);
    setNews([]);
    setCityInfo(null);
    setCurrentPage(1);
    try {
      const response = await fetch(`http://51.21.218.3:8080/api/news/global`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setNews(
          data.map((article: any) => ({
            ...article,
            publishedAt: article.publishedAtString || article.publishedAt,
          }))
        );
      } else if (response.status === 401) {
        setError('Unauthorized: please enter your login and password.');
      } else {
        setError(`Error: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const formatPopulation = (population: number | null): string => {
    if (population === null) return 'Data not available';
    return population.toLocaleString();
  };

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const indexOfLastArticle = currentPage * ARTICLES_PER_PAGE;
  const indexOfFirstArticle = indexOfLastArticle - ARTICLES_PER_PAGE;
  const currentArticles = news.slice(indexOfFirstArticle, indexOfLastArticle);
  const totalPages = Math.ceil(news.length / ARTICLES_PER_PAGE);

  return (
    <Container maxWidth='md' sx={{ py: 4 }} ref={topRef}>
      <Typography variant='h4' gutterBottom>
        Get News by Location
      </Typography>

      <Grid container spacing={2} alignItems='center'>
        <Grid item xs={12} sm={8}>
          <Autocomplete
            freeSolo
            options={cityOptions}
            loading={loadingCities}
            inputValue={searchQuery}
            onInputChange={(event, newInputValue) => {
              setSearchQuery(newInputValue);
              debouncedFetchCities(newInputValue.trim());
            }}
            onChange={(event, newValue) => {
              if (typeof newValue === 'string') {
                setSearchQuery(newValue);
              } else if (newValue) {
                setSearchQuery(newValue);
              }
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label='Enter city and state (e.g., Miami, Florida)'
                fullWidth
              />
            )}
            noOptionsText={
              searchQuery.trim()
                ? 'No matching cities found'
                : 'Type to search for cities'
            }
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <Button
            variant='contained'
            color='primary'
            fullWidth
            onClick={fetchCityNews}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Get News'}
          </Button>
        </Grid>
        <Grid item xs={12}>
          <Button
            variant='outlined'
            color='secondary'
            fullWidth
            onClick={fetchGlobalNews}
            disabled={loading}
            sx={{ mt: 1 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Load Global News'}
          </Button>
        </Grid>
      </Grid>

      {error && (
        <Alert severity='error' sx={{ mt: 3 }}>
          {error}
        </Alert>
      )}

      {news.length > 0 && (
        <>
          <Grid container spacing={3} sx={{ mt: 4 }}>
            {currentArticles.map((article, index) => (
              <Grid item xs={12} key={index}>
                <Card>
                  <Box
                    display='flex'
                    flexDirection={{ xs: 'column', sm: 'row-reverse' }}
                  >
                    {article.urlToImage && (
                      <Box
                        sx={{
                          position: 'relative',
                          width: { xs: '100%', sm: 250 },
                        }}
                      >
                        <CardMedia
                          component='img'
                          image={article.urlToImage}
                          alt={article.title}
                          sx={{ height: 160, objectFit: 'cover' }}
                        />
                        <Box
                          sx={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            bgcolor: 'rgba(0,0,0,0.5)',
                            color: 'white',
                            p: 1,
                            fontSize: '0.75rem',
                          }}
                        >
                          <Link
                            href={article.url}
                            target='_blank'
                            rel='noopener'
                            sx={{ color: 'white', textDecoration: 'none' }}
                          >
                            View original on {article.source?.name || 'source'}
                          </Link>
                        </Box>
                      </Box>
                    )}
                    <Box flex={1} p={2}>
                      <CardContent>
                        <Typography variant='h6'>{article.title}</Typography>
                        <Typography
                          variant='body2'
                          color='text.secondary'
                          gutterBottom
                        >
                          {article.author && `By ${article.author} • `}
                          {article.publishedAt &&
                            formatDate(article.publishedAt)}
                        </Typography>
                        <Typography variant='body1'>
                          {article.description?.substring(0, 120)}
                          {article.description?.length > 120 ? '...' : ''}
                        </Typography>
                      </CardContent>
                      <CardActions>
                        <Link
                          href={article.url}
                          target='_blank'
                          rel='noopener'
                          underline='hover'
                        >
                          Read full article
                        </Link>
                      </CardActions>
                    </Box>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>

          {totalPages > 1 && (
            <Grid container justifyContent='center' sx={{ mt: 4 }}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={(e, page) => {
                  setCurrentPage(page);
                  topRef.current?.scrollIntoView({ behavior: 'smooth' });
                }}
                color='primary'
              />
            </Grid>
          )}
        </>
      )}

      {news.length === 0 && cityInfo && (
        <Box sx={{ mt: 4 }}>
          <Alert severity='info' sx={{ mb: 2 }}>
            It seems there is no news about {cityInfo.city},{' '}
            {cityInfo.stateName}.
          </Alert>
          <Card>
            <CardContent>
              <Typography variant='h5' component='div' gutterBottom>
                {cityInfo.city}, {cityInfo.stateName}
              </Typography>
              {cityInfo.countyName && (
                <Typography
                  variant='subtitle1'
                  color='text.secondary'
                  gutterBottom
                >
                  County: {cityInfo.countyName}
                </Typography>
              )}
              <Typography variant='body1' paragraph>
                <strong>Population:</strong>{' '}
                {formatPopulation(cityInfo.population)}
              </Typography>
              <Typography variant='body1' paragraph>
                <strong>Location:</strong> Latitude: {cityInfo.lat}, Longitude:{' '}
                {cityInfo.lng}
              </Typography>
              <Typography variant='body1'>
                <strong>Timezone:</strong> {cityInfo.timezone}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      )}

      <Box sx={{ mt: 4, textAlign: 'center', fontSize: '0.8rem' }}>
        <Typography variant='body2' color='text.secondary'>
          News data from{' '}
          <Link href='http://newsapi.org' target='_blank'>
            NewsAPI.org
          </Link>
        </Typography>
      </Box>
    </Container>
  );
};

export default HomePage;
