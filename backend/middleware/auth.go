package middleware

import (
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"

	"assessmate-backend/config"

	"github.com/MicahParks/keyfunc/v2"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

var (
	jwks     *keyfunc.JWKS
	jwksOnce sync.Once
	jwksErr  error
)

func getJWKS() (*keyfunc.JWKS, error) {
	jwksOnce.Do(func() {
		jwksURL := fmt.Sprintf("%s/auth/v1/.well-known/jwks.json", config.AppConfig.SupabaseURL)
		fmt.Printf("Fetching JWKS from: %s\n", jwksURL)

		req, err := http.NewRequest("GET", jwksURL, nil)
		if err != nil {
			jwksErr = err
			return
		}
		req.Header.Set("apikey", config.AppConfig.SupabaseAnonKey)

		client := &http.Client{}
		resp, err := client.Do(req)
		if err != nil {
			jwksErr = err
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			jwksErr = fmt.Errorf("failed to fetch JWKS: status %d", resp.StatusCode)
			return
		}

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			jwksErr = err
			return
		}

		jwks, jwksErr = keyfunc.NewJSON(body)
		if jwksErr != nil {
			fmt.Printf("Failed to parse JWKS: %v\n", jwksErr)
		}
	})
	return jwks, jwksErr
}

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header is required"})
			c.Abort()
			return
		}

		bearerToken := strings.Split(authHeader, " ")
		if len(bearerToken) != 2 || strings.ToLower(bearerToken[0]) != "bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization header format"})
			c.Abort()
			return
		}

		tokenString := bearerToken[1]

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			alg := token.Header["alg"]
			fmt.Printf("Token algorithm: %v\n", alg)

			if alg == "HS256" {
				return []byte(config.AppConfig.SupabaseJWTSecret), nil
			}

			if alg == "ES256" {
				k, err := getJWKS()
				if err != nil {
					return nil, err
				}
				return k.Keyfunc(token)
			}

			return nil, fmt.Errorf("unexpected signing method: %v", alg)
		})

		if err != nil {
			fmt.Printf("JWT Parse Error: %v\n", err)
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "Invalid or expired token",
				"details": err.Error(),
			})
			c.Abort()
			return
		}

		if !token.Valid {
			fmt.Println("JWT Token is invalid")
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Token is not valid"})
			c.Abort()
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
			c.Abort()
			return
		}

		// Attach user info to context
		sub, _ := claims["sub"].(string)
		if sub == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID (sub) missing from token"})
			c.Abort()
			return
		}

		c.Set("userId", sub)
		c.Set("email", claims["email"])

		c.Next()
	}
}
